/**
 * components/chat/ChatWindow.jsx
 * ----------------------------------
 * The active conversation: scrollable decrypted message history, a typing
 * indicator, and the message composer. Emits 'typing' / 'stop-typing'
 * socket events as the user types (debounced via a simple timeout).
 */

import { useEffect, useRef, useState } from 'react';
import { Send, ShieldCheck, MessageCircleOff, ArrowLeft } from 'lucide-react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { Avatar } from './Sidebar';
import { useChatStore } from '../../store/chatStore';
import { getSocket } from '../../socket/socket';

const TYPING_STOP_DELAY = 1500;

export default function ChatWindow({ myUserId }) {
  const activeContactId = useChatStore((s) => s.activeContactId);
  const contacts = useChatStore((s) => s.contacts);
  const messagesByContact = useChatStore((s) => s.messagesByContact);
  const typingByContact = useChatStore((s) => s.typingByContact);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const setActiveContact = useChatStore((s) => s.setActiveContact);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const contact = contacts.find((c) => c.id === activeContactId);
  const messages = messagesByContact[activeContactId] || [];
  const isTyping = typingByContact[activeContactId];
  const isOnline = activeContactId && onlineUserIds.has(activeContactId);

  useEffect(() => {
    if (activeContactId) loadConversation(myUserId, activeContactId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContactId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isTyping]);

  function handleDraftChange(e) {
    setDraft(e.target.value);
    const socket = getSocket();
    if (!socket || !activeContactId) return;

    socket.emit('typing', { to: activeContactId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { to: activeContactId });
    }, TYPING_STOP_DELAY);
  }

  function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeContactId) return;

    sendMessage(myUserId, activeContactId, text);
    setDraft('');

    const socket = getSocket();
    clearTimeout(typingTimeoutRef.current);
    socket?.emit('stop-typing', { to: activeContactId });
  }

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-ink-faint gap-3 p-8 text-center">
        <MessageCircleOff size={40} className="opacity-40" />
        <p>Select a conversation to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* --- Header --- */}
      <div className="px-5 py-3.5 border-b border-line flex items-center gap-3">
        <button
          onClick={() => setActiveContact(null)}
          className="sm:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-white/5 text-ink-muted"
        >
          <ArrowLeft size={18} />
        </button>
        <Avatar name={contact.username} avatarUrl={contact.avatar} isOnline={isOnline} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{contact.username}</p>
          <p className="text-xs text-ink-faint">{isOnline ? 'Online' : 'Offline'}</p>
        </div>
        {contact.keyFingerprint && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-ink-faint font-mono" title="Encryption key fingerprint — compare with your contact to verify their identity">
            <ShieldCheck size={12} className="text-ember-glow" />
            {contact.keyFingerprint}
          </div>
        )}
      </div>

      {/* --- Message history --- */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-faint mt-10">
            No messages yet. Say hello — it's just between the two of you.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m._id || m.tempId} message={m} isOwn={m.sender === myUserId} />
        ))}
        {isTyping && <TypingIndicator />}
      </div>

      {/* --- Composer --- */}
      <form onSubmit={handleSend} className="p-4 border-t border-line flex items-center gap-3">
        <input
          type="text"
          value={draft}
          onChange={handleDraftChange}
          placeholder="Type an encrypted message…"
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="btn-ember w-11 h-11 flex items-center justify-center flex-shrink-0 !px-0"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
