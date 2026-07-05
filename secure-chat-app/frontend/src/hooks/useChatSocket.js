/**
 * hooks/useChatSocket.js
 * ------------------------
 * Subscribes to all the real-time events the chat UI cares about and wires
 * them into chatStore. Mount this once near the top of the chat screen.
 */

import { useEffect } from 'react';
import { getSocket } from '../socket/socket';
import { useChatStore } from '../store/chatStore';

export function useChatSocket(myUserId) {
  const receiveMessage = useChatStore((s) => s.receiveMessage);
  const reconcileMessage = useChatStore((s) => s._reconcileMessage);
  const applyReadReceipt = useChatStore((s) => s.applyReadReceipt);
  const setUserOnline = useChatStore((s) => s.setUserOnline);
  const setUserOffline = useChatStore((s) => s.setUserOffline);
  const setOnlineUsers = useChatStore((s) => s.setOnlineUsers);
  const setTyping = useChatStore((s) => s.setTyping);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !myUserId) return;

    const handleIncoming = (payload) => {
      // Ignore echoes of our own sent messages (already handled optimistically).
      if (payload.sender === myUserId) return;
      receiveMessage(myUserId, payload);
    };

    const handleTyping = ({ from }) => setTyping(from, true);
    const handleStopTyping = ({ from }) => setTyping(from, false);
    const handleReadReceipt = ({ by, messageIds }) => applyReadReceipt(by, messageIds);
    const handleUserOnline = ({ userId }) => setUserOnline(userId);
    const handleUserOffline = ({ userId }) => setUserOffline(userId);
    const handleOnlineUsers = ({ userIds }) => setOnlineUsers(userIds);

    socket.on('private-message', handleIncoming);
    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);
    socket.on('read-receipt', handleReadReceipt);
    socket.on('user-online', handleUserOnline);
    socket.on('user-offline', handleUserOffline);
    socket.on('online-users', handleOnlineUsers);

    return () => {
      socket.off('private-message', handleIncoming);
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
      socket.off('read-receipt', handleReadReceipt);
      socket.off('user-online', handleUserOnline);
      socket.off('user-offline', handleUserOffline);
      socket.off('online-users', handleOnlineUsers);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId]);
}
