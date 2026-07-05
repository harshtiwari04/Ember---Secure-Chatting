/**
 * components/chat/TypingIndicator.jsx
 * ---------------------------------------
 * The classic three-dot "someone is typing" bubble.
 */

export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <Dot delay="0s" />
        <Dot delay="0.15s" />
        <Dot delay="0.3s" />
      </div>
    </div>
  );
}

function Dot({ delay }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce"
      style={{ animationDelay: delay, animationDuration: '1s' }}
    />
  );
}
