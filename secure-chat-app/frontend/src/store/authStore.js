/**
 * store/authStore.js
 * --------------------
 * Zustand store for authentication state + the E2EE identity lifecycle.
 *
 * This store is the bridge between the crypto layer (crypto/*) and the
 * network layer (api/axios.js): it decides WHEN to generate keys, WHERE to
 * send the public half, and WHERE to stash the private half.
 */

import { create } from 'zustand';
import api from '../api/axios';
import { createIdentity } from '../crypto/keyManager';
import { savePrivateKey, hasPrivateKey, getPrivateKey } from '../crypto/indexedDb';
import { connectSocket, disconnectSocket } from '../socket/socket';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true, // true during the initial "am I already logged in?" check
  isAuthenticating: false, // true during login/register/verify network calls
  error: null,

  /**
   * Called once when the app boots. Tries GET /api/auth/me using the
   * existing cookie (if any) to silently restore a session.
   */
  async checkSession() {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, isLoading: false });
      connectSocket();
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  /**
   * Registration step 1: generate an E2EE identity locally, then send the
   * PUBLIC half to the server along with the usual signup fields. The
   * PRIVATE half is saved to IndexedDB the moment we know the user's id.
   */
  async register({ username, email, password }) {
    set({ isAuthenticating: true, error: null });
    try {
      const { publicKeyJwk, privateKeyJwk, fingerprint } = await createIdentity();

      const { data } = await api.post('/auth/register', {
        username,
        email,
        password,
        publicKey: JSON.stringify(publicKeyJwk),
        keyFingerprint: fingerprint,
      });

      // Stash the private key locally now, keyed by email since we don't
      // have a Mongo _id yet (the account isn't verified/logged-in yet).
      // We re-key it to the real user id right after verification succeeds.
      await savePrivateKey(email.toLowerCase(), privateKeyJwk);

      set({ isAuthenticating: false });
      return { ok: true, email: data.email };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      set({ isAuthenticating: false, error: message });
      return { ok: false, error: message };
    }
  },

  /** Registration step 2: confirm the emailed OTP, which logs the user in. */
  async verifyOtp({ email, code }) {
    set({ isAuthenticating: true, error: null });
    try {
      const { data } = await api.post('/auth/verify-otp', { email, code });

      // Re-key the private key from "pending:email" to the real user id so
      // future lookups (keyed by user.id) find it.
      const pendingKey = await hasPrivateKey(email.toLowerCase());
      if (pendingKey) {
        const jwk = await getPrivateKey(email.toLowerCase());
        await savePrivateKey(data.user.id, jwk);
      }

      set({ user: data.user, isAuthenticating: false });
      connectSocket();
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Verification failed.';
      set({ isAuthenticating: false, error: message });
      return { ok: false, error: message };
    }
  },

  async resendOtp({ email, purpose }) {
    try {
      await api.post('/auth/resend-otp', { email, purpose });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Could not resend code.' };
    }
  },

  async login({ email, password }) {
    set({ isAuthenticating: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      set({ user: data.user, isAuthenticating: false });
      connectSocket();
      return { ok: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed.';
      const needsVerification = err.response?.data?.needsVerification;
      set({ isAuthenticating: false, error: message });
      return { ok: false, error: message, needsVerification, email: err.response?.data?.email };
    }
  },

  async forgotPassword(email) {
    try {
      await api.post('/auth/forgot-password', { email });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Something went wrong.' };
    }
  },

  async resetPassword({ email, code, newPassword }) {
    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Reset failed.' };
    }
  },

  /**
   * Called after a Google OAuth redirect for brand-new accounts that don't
   * have an E2EE identity yet. Generates one locally and PATCHes the public
   * half up to the server.
   */
  async generateAndUploadKeys() {
    const { user } = get();
    if (!user) return { ok: false, error: 'Not logged in.' };
    try {
      const { publicKeyJwk, privateKeyJwk, fingerprint } = await createIdentity();
      await savePrivateKey(user.id, privateKeyJwk);

      const { data } = await api.patch('/users/keys', {
        publicKey: JSON.stringify(publicKeyJwk),
        keyFingerprint: fingerprint,
      });

      set({ user: data.user });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Key generation failed.' };
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      disconnectSocket();
      set({ user: null });
    }
  },

  clearError() {
    set({ error: null });
  },
}));
