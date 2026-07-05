/**
 * pages/AuthCallback.jsx
 * -------------------------
 * Landing spot for the redirect from GET /api/auth/google/callback.
 *
 * The backend has already set our JWT cookie by the time we get here; this
 * page's job is just to:
 *   1. Confirm the session (GET /api/auth/me) to populate authStore.user
 *   2. If ?needsKeys=true (brand-new Google signup with no E2EE identity
 *      yet), generate an ECDH key pair locally and upload the public half.
 *   3. Redirect to /chat.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const checkSession = useAuthStore((s) => s.checkSession);
  const generateAndUploadKeys = useAuthStore((s) => s.generateAndUploadKeys);
  const [statusText, setStatusText] = useState('Finishing sign-in…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await checkSession();

      const needsKeys = searchParams.get('needsKeys') === 'true';
      if (needsKeys) {
        setStatusText('Generating your encryption keys…');
        await generateAndUploadKeys();
      }

      if (!cancelled) navigate('/chat', { replace: true });
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-void text-ink-primary">
      <ShieldCheck size={32} className="text-ember animate-pulseGlow" />
      <p className="text-sm text-ink-muted">{statusText}</p>
    </div>
  );
}
