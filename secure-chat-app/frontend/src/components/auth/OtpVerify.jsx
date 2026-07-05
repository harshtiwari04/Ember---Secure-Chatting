/**
 * components/auth/OtpVerify.jsx
 * --------------------------------
 * A 6-digit code entry screen used for the registration email-verification
 * step. (Password-reset has its own similar step inside ForgotPassword.jsx
 * since it also needs a "new password" field right after the code.)
 */

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

const CODE_LENGTH = 6;

export default function OtpVerify({ email, purpose, onVerified, onBack }) {
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const resendOtp = useAuthStore((s) => s.resendOtp);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function handleChange(index, value) {
    const clean = value.replace(/\D/g, '').slice(-1); // digits only, one char
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits(pasted.split('').concat(Array(CODE_LENGTH - pasted.length).fill('')));
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) {
      toast.error('Enter the full code.');
      return;
    }

    const result = await verifyOtp({ email, code });
    if (result.ok) {
      toast.success('Email verified!');
      onVerified();
    } else {
      toast.error(result.error);
    }
  }

  async function handleResend() {
    const result = await resendOtp({ email, purpose });
    if (result.ok) {
      toast.success('New code sent.');
      setCooldown(30);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <GlassCard>
      <h2 className="font-display text-2xl mb-1">Check your email</h2>
      <p className="text-sm text-ink-muted mb-6">
        We sent a {CODE_LENGTH}-digit code to <span className="text-ink-primary">{email}</span>.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 justify-between mb-6" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="input-field text-center font-mono text-lg w-11 h-12 px-0"
            />
          ))}
        </div>

        <Button type="submit" isLoading={isAuthenticating} className="w-full">
          Verify email
        </Button>
      </form>

      <div className="flex items-center justify-between mt-5 text-sm">
        <button onClick={onBack} className="text-ink-muted hover:text-ink-primary transition-colors">
          Back
        </button>
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-ember hover:text-ember-glow disabled:text-ink-faint disabled:cursor-not-allowed transition-colors font-medium"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </GlassCard>
  );
}
