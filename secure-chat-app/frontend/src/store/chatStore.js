/**
 * store/chatStore.js
 * --------------------
 * Owns the chat UI's state: the contact list, the active conversation,
 * message history, online presence, and typing indicators.
 *
 * This is also where encryption/decryption actually gets *invoked* (the
 * crypto module itself just provides the primitives). Each contact gets a
 * cached derived AES key so we don't re-run ECDH+HKDF on every keystroke.
 */

import { create } from 'zustand';
import api from '../api/axios';
import { getSocket } from '../socket/socket';
import { getPrivateKey } from '../crypto/indexedDb';
import { importPrivateKey, importPublicKey } from '../crypto/keyManager';
import { deriveSharedKey, encryptMessage, decryptMessage } from '../crypto/encryption';

// contactId -> CryptoKey (derived AES-GCM key), kept in memory only.
const sharedKeyCache = new Map();

/**
 * Lazily derives (and caches) the AES-GCM key shared with a given contact.
 * Requires the current user's private key (from IndexedDB) and the
 * contact's public key (from the server-provided contact object).
 */
async function getSharedKeyForContact(myUserId, contact) {
  if (sharedKeyCache.has(contact.id || contact._id)) {
    return sharedKeyCache.get(contact.id || contact._id);
  }

  const privateJwk = await getPrivateKey(myUserId);
  if (!privateJwk) {
    throw new Error('Your private key was not found on this device. Try logging in from the device where you originally signed up, or reset your identity.');
  }
  if (!contact.publicKey) {
    throw new Error(`${contact.username} has not set up encryption yet.`);
  }

  const myPrivateKey = await importPrivateKey(privateJwk);
  const theirPublicKey = await importPublicKey(JSON.parse(contact.publicKey));
  const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKey);

  sharedKeyCache.set(contact.id || contact._id, sharedKey);
  return sharedKey;
}

export const useChatStore = create((set, get) => ({
  contacts: [], // all other users, each with { id, username, publicKey, ... }
  onlineUserIds: new Set(),
  activeContactId: null,
  // messagesByContact: { [contactId]: Array<{ _id, tempId, sender, recipient, text, status, createdAt, failed }> }
  messagesByContact: {},
  typingByContact: {}, // { [contactId]: boolean }
  isLoadingContacts: false,
  isLoadingMessages: false,

  async loadContacts() {
    set({ isLoadingContacts: true });
    try {
      const { data } = await api.get('/users');
      set({ contacts: data.users.map((u) => ({ ...u, id: u._id })), isLoadingContacts: false });
    } catch (err) {
      console.error('Failed to load contacts:', err);
      set({ isLoadingContacts: false });
    }
  },

  setActiveContact(contactId) {
    set({ activeContactId: contactId });
  },

  /** Loads + decrypts the full history with one contact. */
  async loadConversation(myUserId, contactId) {
    set({ isLoadingMessages: true });
    try {
      const { data } = await api.get(`/messages/${contactId}`);
      const contact = get().contacts.find((c) => c.id === contactId);
      if (!contact) throw new Error('Unknown contact.');

      const sharedKey = await getSharedKeyForContact(myUserId, contact);

      const decrypted = await Promise.all(
        data.messages.map(async (m) => {
          try {
            const text = await decryptMessage(sharedKey, m.ciphertext, m.iv);
            return { ...m, text, failed: false };
          } catch (e) {
            return { ...m, text: '[Unable to decrypt this message]', failed: true };
          }
        })
      );

      set((state) => ({
        messagesByContact: { ...state.messagesByContact, [contactId]: decrypted },
        isLoadingMessages: false,
      }));
    } catch (err) {
      console.error('Failed to load conversation:', err);
      set({ isLoadingMessages: false });
    }
  },

  /**
   * Encrypts and sends a message to a contact over the socket. Uses an
   * optimistic local bubble (status: 'sending') that gets reconciled once
   * the server acknowledges persistence.
   */
  async sendMessage(myUserId, contactId, plaintext) {
    const contact = get().contacts.find((c) => c.id === contactId);
    if (!contact) return;

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const optimisticMessage = {
      tempId,
      sender: myUserId,
      recipient: contactId,
      text: plaintext,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messagesByContact: {
        ...state.messagesByContact,
        [contactId]: [...(state.messagesByContact[contactId] || []), optimisticMessage],
      },
    }));

    try {
      const sharedKey = await getSharedKeyForContact(myUserId, contact);
      const { ciphertext, iv } = await encryptMessage(sharedKey, plaintext);

      const socket = getSocket();
      socket.emit('private-message', { to: contactId, ciphertext, iv, tempId }, (ack) => {
        if (!ack?.ok) {
          get()._markMessageFailed(contactId, tempId);
          return;
        }
        get()._reconcileMessage(contactId, tempId, ack.message);
      });
    } catch (err) {
      console.error('Encryption/send failed:', err);
      get()._markMessageFailed(contactId, tempId);
    }
  },

  /** Internal: replaces an optimistic message with the server-confirmed one. */
  _reconcileMessage(contactId, tempId, serverMessage) {
    set((state) => {
      const list = state.messagesByContact[contactId] || [];
      const updated = list.map((m) =>
        m.tempId === tempId
          ? { ...m, _id: serverMessage._id, status: serverMessage.status, createdAt: serverMessage.createdAt }
          : m
      );
      return { messagesByContact: { ...state.messagesByContact, [contactId]: updated } };
    });
  },

  _markMessageFailed(contactId, tempId) {
    set((state) => {
      const list = state.messagesByContact[contactId] || [];
      const updated = list.map((m) => (m.tempId === tempId ? { ...m, status: 'failed', failed: true } : m));
      return { messagesByContact: { ...state.messagesByContact, [contactId]: updated } };
    });
  },

  /** Handles an incoming 'private-message' socket event (someone messaged us). */
  async receiveMessage(myUserId, payload) {
    const { sender } = payload;
    const contact = get().contacts.find((c) => c.id === sender);
    if (!contact) return; // unknown sender - shouldn't happen in a closed contact list, but stay safe

    let text = '[Unable to decrypt this message]';
    let failed = true;
    try {
      const sharedKey = await getSharedKeyForContact(myUserId, contact);
      text = await decryptMessage(sharedKey, payload.ciphertext, payload.iv);
      failed = false;
    } catch (err) {
      console.error('Decryption failed:', err);
    }

    set((state) => ({
      messagesByContact: {
        ...state.messagesByContact,
        [sender]: [...(state.messagesByContact[sender] || []), { ...payload, text, failed }],
      },
    }));

    // If we currently have this conversation open, tell the sender we've read it.
    if (get().activeContactId === sender) {
      const socket = getSocket();
      socket.emit('read-receipt', { from: sender, messageIds: [payload._id] });
    }
  },

  applyReadReceipt(contactId, messageIds) {
    set((state) => {
      const list = state.messagesByContact[contactId] || [];
      const idSet = new Set(messageIds.map(String));
      const updated = list.map((m) => (idSet.has(String(m._id)) ? { ...m, status: 'read' } : m));
      return { messagesByContact: { ...state.messagesByContact, [contactId]: updated } };
    });
  },

  setUserOnline(userId) {
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.add(userId);
      return { onlineUserIds: next };
    });
  },

  setUserOffline(userId) {
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);
      return { onlineUserIds: next };
    });
  },

  setOnlineUsers(userIds) {
    set({ onlineUserIds: new Set(userIds) });
  },

  setTyping(contactId, isTyping) {
    set((state) => ({ typingByContact: { ...state.typingByContact, [contactId]: isTyping } }));
  },

  reset() {
    sharedKeyCache.clear();
    set({
      contacts: [],
      onlineUserIds: new Set(),
      activeContactId: null,
      messagesByContact: {},
      typingByContact: {},
    });
  },
}));
