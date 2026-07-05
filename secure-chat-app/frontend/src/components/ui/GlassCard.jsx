/**
 * components/ui/GlassCard.jsx
 * ------------------------------
 * The glassmorphic container used for auth forms floating over the 3D
 * landing scene. Kept as a tiny wrapper so the "glass" look stays
 * consistent everywhere it's used.
 */

export default function GlassCard({ children, className = '' }) {
  return <div className={`glass-panel p-8 ${className}`}>{children}</div>;
}
