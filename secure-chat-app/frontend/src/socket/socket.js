/**
 * socket/socket.js
 * ------------------
 * A single shared Socket.io client instance for the whole app.
 *
 * We connect lazily (only after a successful login) and disconnect on
 * logout, rather than connecting eagerly on app load, since an
 * unauthenticated socket has nothing useful to do anyway.
 */

import { io } from 'socket.io-client';
import { API_URL } from '../api/axios';

let socket = null;

/** Creates (or returns the existing) authenticated socket connection. */
export function connectSocket() {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    withCredentials: true, // sends the httpOnly JWT cookie during the handshake
    autoConnect: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
