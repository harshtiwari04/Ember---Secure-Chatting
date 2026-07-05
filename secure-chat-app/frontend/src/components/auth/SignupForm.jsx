/**
 * components/auth/SignupForm.jsx
 * ---------------------------------
 * New account form. On submit, authStore.register() generates the user's
 * ECDH key pair locally BEFORE anything goes to the network - see
 * store/authStore.js for the full explanation.
 */

import { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

export default function SignupForm({ onSwitchToLogin, onRegistered }) {
  const register = useAuthStore((s) => s.register);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [generatingKeys, setGeneratingKeys] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setGeneratingKeys(true);
    const result = await register(form);
    setGeneratingKeys(false);

    if (result.ok) {
      toast.success('Account created. Check your email for a code.');
      onRegistered(result.email);
    } else {
      toast.error(result.error);
    }
  }

  const busy = isAuthenticating || generatingKeys;

  return (
    <GlassCard>
      <h2 className="font-display text-2xl mb-1">Create your account</h2>
      <p className="text-sm text-ink-muted mb-6">
        We'll generate a private encryption key on this device — it never leaves your browser.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User size={16} className="absolute left-3 top-3.5 text-ink-faint" />
          <input
            type="text"
            required
            minLength={3}
            maxLength={30}
            placeholder="Username"
            value={form.username}
            onChange={update('username')}
            className="input-field pl-10"
            autoComplete="username"
          />
        </div>

        <div className="relative">
          <Mail size={16} className="absolute left-3 top-3.5 text-ink-faint" />
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            className="input-field pl-10"
            autoComplete="email"
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3 top-3.5 text-ink-faint" />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min. 8 characters)"
            value={form.password}
            onChange={update('password')}
            className="input-field pl-10"
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" isLoading={busy} className="w-full">
          {generatingKeys ? 'Generating your encryption keys…' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-ink-muted text-center mt-6">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="text-ember hover:text-ember-glow transition-colors font-medium">
          Log in
        </button>
      </p>
    </GlassCard>
  );
}
