/**
 * components/chat/MessageBubble.jsx
 * -------------------------------------
 * Renders a single decrypted message with WhatsApp-style status ticks:
 *   sending -> one faint clock icon
 *   sent    -> one check
 *   delivered -> two checks
 *   read    -> two checks, colored
 *   failed  -> red warning + hint to retry
 */

import { Check, CheckCheck, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function MessageBubble({ message, isOwn }) {
  const time = message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : '';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] sm:max-w-[60%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isOwn ? 'bg-ember text-void rounded-br-sm' : 'bg-white/5 border border-white/10 rounded-bl-sm'}
          ${message.failed ? 'opacity-70' : ''}`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <div className={`flex items-center gap-1 mt-1 justify-end ${isOwn ? 'text-void/70' : 'text-ink-faint'}`}>
          <span className="text-[10px]">{time}</span>
          {isOwn && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  switch (status) {
    case 'sending':
      return <Clock size={12} />;
    case 'sent':
      return <Check size={12} />;
    case 'delivered':
      return <CheckCheck size={12} />;
    case 'read':
      return <CheckCheck size={12} className="text-blue-300" />;
    case 'failed':
      return <AlertTriangle size={12} className="text-red-400" />;
    default:
      return null;
  }
}
