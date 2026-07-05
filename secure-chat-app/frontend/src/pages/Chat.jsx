/**
 * pages/Chat.jsx
 * ----------------
 * The authenticated chat screen ("/chat"). Route guarding (redirect to "/"
 * if not logged in) is handled in App.jsx.
 */

import ChatLayout from '../components/chat/ChatLayout';

export default function Chat() {
  return <ChatLayout />;
}
