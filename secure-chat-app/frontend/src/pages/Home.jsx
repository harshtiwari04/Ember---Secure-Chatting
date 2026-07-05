/**
 * pages/Home.jsx
 * ----------------
 * Public entry point ("/"). Just renders the landing page; redirect-to-chat
 * for already-authenticated users is handled centrally in App.jsx.
 */

import LandingPage from '../components/landing/LandingPage';

export default function Home() {
  return <LandingPage />;
}
