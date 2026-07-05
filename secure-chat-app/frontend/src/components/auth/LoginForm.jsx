/**
 * components/auth/LoginForm.jsx
 * --------------------------------
 * Email/password login + a "Continue with Google" button. On failed login
 * due to an unverified account, hands control back to LandingPage to show
 * the OTP verification screen instead of just showing an error.
 */

import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../api/axios';

export default function LoginForm({ onSwitchToSignup, onSwitchToForgot, onNeedsVerification }) {
  const login = useAuthStore((s) => s.login);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await login({ email, password });
    if (!result.ok) {
      if (result.needsVerification) {
        toast('Please verify your email first.', { icon: '📧' });
        onNeedsVerification(result.email || email);
        return;
      }
      toast.error(result.error);
    }
  }

  return (
    <GlassCard>
      <h2 className="font-display text-2xl mb-1">Welcome back</h2>
      <p className="text-sm text-ink-muted mb-6">Log in to pick up where you left off.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-3.5 text-ink-faint" />
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field pl-10"
            autoComplete="email"
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3 top-3.5 text-ink-faint" />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field pl-10"
            autoComplete="current-password"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSwitchToForgot}
            className="text-xs text-ink-muted hover:text-ember transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" isLoading={isAuthenticating} className="w-full">
          Log in
        </Button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-ink-faint">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <a href={`${API_URL}/api/auth/google`} className="btn-ghost w-full flex items-center justify-center gap-2">
        <GoogleIcon />
        Continue with Google
      </a>

      <p className="text-sm text-ink-muted text-center mt-6">
        New here?{' '}
        <button onClick={onSwitchToSignup} className="text-ember hover:text-ember-glow transition-colors font-medium">
          Create an account
        </button>
      </p>
    </GlassCard>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.4 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.4 18.9 12 24 12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.4 6 29.5 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-1.8 13.9-5l-6.4-5.4C29.4 35.4 26.8 36 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.6 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 3-3.1 5.5-5.9 7.1l6.4 5.4C39.5 37.5 44 31.4 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
