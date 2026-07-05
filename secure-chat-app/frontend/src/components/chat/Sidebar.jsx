/**
 * components/chat/Sidebar.jsx
 * ------------------------------
 * Left-hand contact list. Shows every other registered user with an
 * online/offline status dot and, if we have message history loaded, a
 * one-line preview of the last message.
 */

import { LogOut, ShieldCheck } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
  const contacts = useChatStore((s) => s.contacts);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const activeContactId = useChatStore((s) => s.activeContactId);
  const setActiveContact = useChatStore((s) => s.setActiveContact);
  const messagesByContact = useChatStore((s) => s.messagesByContact);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-full sm:w-80 h-full flex flex-col border-r border-line bg-void-soft">
      {/* --- Current user header --- */}
      <div className="p-4 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={user?.username} avatarUrl={user?.avatar} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-ink-faint flex items-center gap-1">
              <ShieldCheck size={12} className="text-ember-glow" /> Encrypted
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Log out"
          className="p-2 rounded-lg hover:bg-white/5 text-ink-muted hover:text-ember transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* --- Contact list --- */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 && (
          <p className="text-sm text-ink-faint p-4">No other users yet. Invite a friend to sign up.</p>
        )}

        {contacts.map((contact) => {
          const isOnline = onlineUserIds.has(contact.id);
          const isActive = contact.id === activeContactId;
          const history = messagesByContact[contact.id] || [];
          const lastMessage = history[history.length - 1];

          return (
            <button
              key={contact.id}
              onClick={() => setActiveContact(contact.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-line/60
                ${isActive ? 'bg-ember/10' : 'hover:bg-white/5'}`}
            >
              <Avatar name={contact.username} avatarUrl={contact.avatar} isOnline={isOnline} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{contact.username}</p>
                <p className="text-xs text-ink-faint truncate">
                  {lastMessage ? lastMessage.text : isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function Avatar({ name, avatarUrl, isOnline }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div className="relative flex-shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ember to-ember-deep flex items-center justify-center font-display text-sm">
          {initial}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-void-soft
            ${isOnline ? 'bg-green-500' : 'bg-ink-faint'}`}
        />
      )}
    </div>
  );
}

export { Avatar };
