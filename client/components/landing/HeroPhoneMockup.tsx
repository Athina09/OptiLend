/**
 * Minimal realistic phone mockup (CSS only — no Three.js on the hero).
 */
export function HeroPhoneMockup() {
  return (
    <div
      className="relative mx-auto w-full max-w-[320px] select-none lg:max-w-none"
      aria-hidden
    >
      {/* Soft accent orb — matches reference minimal scene */}
      <div className="pointer-events-none absolute -left-4 top-1/4 h-24 w-24 rounded-full bg-white shadow-[0_8px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 lg:-left-8 lg:h-28 lg:w-28" />

      <div className="relative flex flex-col items-center pt-8">
        {/* Pedestal */}
        <div
          className="relative z-0 h-4 w-[72%] max-w-[220px] rounded-t-xl bg-white shadow-[inset_0_1px_0_rgba(255,255,255,1),0_12px_32px_-8px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/60"
          style={{
            clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)',
          }}
        />

        <div className="relative z-10 -mt-1 animate-float">
          {/* Metallic frame */}
          <div
            className="rounded-[2.75rem] p-[11px] shadow-[0_32px_64px_-16px_rgba(15,23,42,0.28),0_0_0_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-2px_4px_rgba(15,23,42,0.04)]"
            style={{
              background:
                'linear-gradient(145deg, #e8eaef 0%, #f4f5f8 45%, #d4d7de 100%)',
            }}
          >
            <div className="overflow-hidden rounded-[2.15rem] bg-black ring-1 ring-black/20">
              {/* Screen */}
              <div className="relative flex aspect-[9/19.2] w-[min(260px,72vw)] flex-col bg-gradient-to-b from-teal-950 via-cyan-950 to-slate-950 lg:w-[280px]">
                {/* Status */}
                <div className="flex shrink-0 items-center justify-between px-5 pt-3 text-[10px] font-medium text-white/90">
                  <span className="tracking-tight">9:41</span>
                  <div className="flex items-center gap-1">
                    <span className="h-2.5 w-4 rounded-sm border border-white/40" />
                    <span className="text-[9px]">5G</span>
                  </div>
                </div>

                {/* Dynamic Island */}
                <div className="flex justify-center pt-1">
                  <div className="h-7 w-[88px] rounded-full bg-black shadow-inner ring-1 ring-white/10" />
                </div>

                {/* App body */}
                <div className="flex flex-1 flex-col px-5 pb-8 pt-6">
                  <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300/80">
                    Optilend
                  </p>
                  <h2 className="mt-3 text-center font-display text-xl font-semibold leading-snug tracking-tight text-white">
                    Credit intelligence for your MSME
                  </h2>
                  <p className="mt-2 text-center text-xs leading-relaxed text-white/65">
                    Transparent scores, RBI-aligned flows.
                  </p>

                  {/* Card stack hint */}
                  <div className="relative mx-auto mt-6 h-[72px] w-full max-w-[200px]">
                    <div className="absolute left-2 top-2 h-14 w-[88%] rotate-[-8deg] rounded-xl bg-gradient-to-br from-emerald-400/90 to-teal-600 shadow-lg shadow-teal-900/40 ring-1 ring-white/20" />
                    <div className="absolute right-2 top-0 h-14 w-[88%] rotate-[6deg] rounded-xl bg-gradient-to-br from-cyan-400/85 to-cyan-700 shadow-lg shadow-cyan-950/50 ring-1 ring-white/25" />
                  </div>

                  {/* Balance-style tile */}
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-inner backdrop-blur-sm">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                      OptilendScore™
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-white">
                      782
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-300/90">Strong eligibility</p>
                  </div>

                  <div className="mt-auto space-y-2.5 pt-6">
                    <div className="rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 py-3 text-center text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-950/30">
                      Get started
                    </div>
                    <div className="rounded-xl border border-white/25 py-2.5 text-center text-sm font-medium text-white/90">
                      Sign in
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact shadow */}
          <div
            className="pointer-events-none mx-auto mt-3 h-4 w-[55%] rounded-[100%] bg-slate-900/15 blur-md"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
