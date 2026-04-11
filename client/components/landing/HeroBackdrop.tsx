/** Lightweight landing background — no Three.js (faster compile + first paint). */
export function HeroBackdrop() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-cyan-50/40" aria-hidden>
      <div
        className="absolute -left-1/4 top-0 h-[70vh] w-[70vw] rounded-full bg-cyan-400/15 blur-3xl animate-pulse-soft"
        style={{ animationDuration: '5s' }}
      />
      <div
        className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vw] rounded-full bg-teal-400/15 blur-3xl animate-pulse-soft"
        style={{ animationDuration: '7s', animationDelay: '1s' }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/85" />
    </div>
  );
}
