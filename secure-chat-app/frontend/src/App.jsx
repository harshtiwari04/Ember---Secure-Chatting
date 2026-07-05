/**
 * App.jsx
 * -------
 * Top-level route table. Also runs the one-time "is there already a valid
 * session?" check on mount so a page refresh doesn't kick a logged-in user
 * back to the landing page.
 */

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Home from './pages/Home';
import Chat from './pages/Chat';
import AuthCallback from './pages/AuthCallback';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <span className="w-3 h-3 rounded-full bg-ember animate-pulseGlow" />
    </div>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#171420',
            color: '#F5EFE6',
            border: '1px solid #2A2430',
          },
        }}
      />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/chat" replace /> : <Home />} />
        <Route path="/chat" element={user ? <Chat /> : <Navigate to="/" replace />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
