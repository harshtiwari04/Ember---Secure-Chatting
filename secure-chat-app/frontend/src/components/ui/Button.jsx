/**
 * components/ui/Button.jsx
 * --------------------------
 * A small button wrapper with a built-in loading spinner state so every
 * async action in the app (login, send message, etc.) gets consistent
 * "in-flight" feedback without re-implementing a spinner each time.
 */

import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'ghost'
  isLoading = false,
  className = '',
  ...rest
}) {
  const base = variant === 'primary' ? 'btn-ember' : 'btn-ghost';
  return (
    <button className={`${base} ${className} flex items-center justify-center gap-2`} disabled={isLoading || rest.disabled} {...rest}>
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
