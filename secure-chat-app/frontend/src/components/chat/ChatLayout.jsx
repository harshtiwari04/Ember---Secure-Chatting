/**
 * components/chat/ChatLayout.jsx
 * ----------------------------------
 * The authenticated chat screen shell. Loads the contact list once, wires
 * up all real-time socket listeners via useChatSocket, and lays out the
 * Sidebar + ChatWindow side by side (stacked on mobile).
 */

import { useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useChatSocket } from '../../hooks/useChatSocket';

export default function ChatLayout() {
  const user = useAuthStore((s) => s.user);
  const loadContacts = useChatStore((s) => s.loadContacts);
  const activeContactId = useChatStore((s) => s.activeContactId);

  useChatSocket(user?.id);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <div className="h-screen w-full flex bg-void">
      {/* On mobile, show either the sidebar or the active chat, not both. */}
      <div className={`${activeContactId ? 'hidden' : 'flex'} sm:flex w-full sm:w-auto`}>
        <Sidebar />
      </div>
      <div className={`${activeContactId ? 'flex' : 'hidden'} sm:flex flex-1`}>
        <ChatWindow myUserId={user?.id} />
      </div>
    </div>
  );
}
