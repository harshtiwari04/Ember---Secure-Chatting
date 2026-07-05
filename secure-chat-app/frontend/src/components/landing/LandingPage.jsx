/**
 * components/landing/LandingPage.jsx
 * --------------------------------------
 * The public-facing entry screen: the 3D ember scene fills the background,
 * a brand mark + one-line thesis sits on the left (on wide screens), and a
 * glassmorphic auth card sits on the right holding whichever auth view is
 * currently active (login / signup / OTP / forgot password).
 */

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import Scene3D from './Scene3D';
import LoginForm from '../auth/LoginForm';
import SignupForm from '../auth/SignupForm';
import OtpVerify from '../auth/OtpVerify';
import ForgotPassword from '../auth/ForgotPassword';

// The auth card is a tiny internal state machine so we don't need routes
// for every step of a flow that's really "one screen, several moments."
const VIEWS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  VERIFY: 'verify',
  FORGOT: 'forgot',
};

export default function LandingPage() {
  const [view, setView] = useState(VIEWS.LOGIN);
  const [pendingEmail, setPendingEmail] = useState(''); // carried from signup -> verify

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Scene3D />

      {/* Subtle vignette so the auth card and copy stay legible over the scene */}
      <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-transparent to-void pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-void/60 via-transparent to-void/20 pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-between max-w-6xl mx-auto px-6 lg:px-12 py-12 gap-12">
        {/* --- Brand / thesis panel ------------------------------------------------ */}
        <div className="max-w-md lg:pt-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-ember animate-pulseGlow shadow-ember" />
            <span className="text-sm tracking-widest uppercase text-ink-muted">Ember</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl leading-tight text-ink-primary glow-text">
            A quiet place to talk, <span className="text-ember">privately.</span>
          </h1>

          <p className="mt-5 text-ink-muted text-base leading-relaxed">
            Every message is encrypted on your device before it ever leaves it, and can only
            be read on the device it's meant for. Not by us, not by anyone in between.
          </p>

          <div className="mt-8 flex items-center gap-3 text-sm text-ink-faint">
            <ShieldCheck size={18} className="text-ember-glow" />
            <span>ECDH key exchange · AES-GCM encryption · zero plaintext storage</span>
          </div>
        </div>

        {/* --- Auth card ------------------------------------------------------------ */}
        <div className="w-full max-w-sm">
          {view === VIEWS.LOGIN && (
            <LoginForm
              onSwitchToSignup={() => setView(VIEWS.SIGNUP)}
              onSwitchToForgot={() => setView(VIEWS.FORGOT)}
              onNeedsVerification={(email) => {
                setPendingEmail(email);
                setView(VIEWS.VERIFY);
              }}
            />
          )}

          {view === VIEWS.SIGNUP && (
            <SignupForm
              onSwitchToLogin={() => setView(VIEWS.LOGIN)}
              onRegistered={(email) => {
                setPendingEmail(email);
                setView(VIEWS.VERIFY);
              }}
            />
          )}

          {view === VIEWS.VERIFY && (
            <OtpVerify
              email={pendingEmail}
              purpose="register"
              onVerified={() => {
                /* App.jsx watches the auth store and will redirect to /chat automatically */
              }}
              onBack={() => setView(VIEWS.SIGNUP)}
            />
          )}

          {view === VIEWS.FORGOT && (
            <ForgotPassword onBack={() => setView(VIEWS.LOGIN)} />
          )}
        </div>
      </div>
    </div>
  );
}
