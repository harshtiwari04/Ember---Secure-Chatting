/**
 * components/auth/ForgotPassword.jsx
 * --------------------------------------
 * Two-step flow in one component:
 *   Step 1: enter email -> request a reset code
 *   Step 2: enter code + new password -> reset
 *
 * Kept as a single small state machine (rather than 2 files) since the
 * steps are tightly coupled and share the email value.
 */

import { useState } from 'react';
import { Mail, Lock, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

export default function ForgotPassword({ onBack }) {
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await forgotPassword(email);
    setIsSubmitting(false);
    if (result.ok) {
      toast.success('If that account exists, a code is on its way.');
      setStep('reset');
    } else {
      toast.error(result.error);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    const result = await resetPassword({ email, code, newPassword });
    setIsSubmitting(false);
    if (result.ok) {
      toast.success('Password updated. You can log in now.');
      onBack();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <GlassCard>
      {step === 'request' ? (
        <>
          <h2 className="font-display text-2xl mb-1">Reset your password</h2>
          <p className="text-sm text-ink-muted mb-6">
            Enter your account email and we'll send you a reset code.
          </p>
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3.5 text-ink-faint" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Send reset code
            </Button>
          </form>
        </>
      ) : (
        <>
          <h2 className="font-display text-2xl mb-1">Enter your new password</h2>
          <p className="text-sm text-ink-muted mb-6">
            Check <span className="text-ink-primary">{email}</span> for the code we sent.
          </p>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3.5 text-ink-faint" />
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field pl-10 font-mono tracking-widest"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5 text-ink-faint" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Update password
            </Button>
          </form>
        </>
      )}

      <button onClick={onBack} className="text-sm text-ink-muted hover:text-ink-primary transition-colors mt-5">
        Back to login
      </button>
    </GlassCard>
  );
}
