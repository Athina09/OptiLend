'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { gsap } from '@/lib/gsap';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function LoadingScreen({ onComplete, minDuration = 1600 }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const logoRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const lettersRef = useRef<HTMLSpanElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;

    // Schedule dismiss FIRST — never depend on GSAP for leaving the splash (GSAP errors = infinite hang).
    const ms = Math.max(minDuration, 0);
    const timer = window.setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setVisible(false);
      onComplete?.();
    }, ms);

    let ctx: ReturnType<typeof gsap.context> | undefined;
    try {
      ctx = gsap.context(() => {
        try {
          if (!logoRef.current || !progressRef.current || !ref.current) return;
          gsap.fromTo(
            logoRef.current,
            { scale: 0.5, opacity: 0, rotationY: -180 },
            { scale: 1, opacity: 1, rotationY: 0, duration: 1, ease: 'back.out(1.2)' }
          );
          gsap.to(logoRef.current, {
            rotation: 360,
            duration: 3,
            repeat: -1,
            ease: 'none',
            delay: 0.5,
          });
          if (textRef.current) {
            gsap.fromTo(textRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.8 });
          }
          if (lettersRef.current) {
            const letters = lettersRef.current.querySelectorAll('span');
            gsap.fromTo(
              letters,
              { opacity: 0, y: 5 },
              { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, delay: 1 }
            );
          }
          /* Progress bar: CSS class loading-screen-progress-fill (globals.css) — reliable without GSAP */
        } catch {
          /* visuals only */
        }
      });
    } catch {
      /* gsap.context failed — timeout still dismisses */
    }

    // Failsafe if Strict Mode or something clears the main timer without remounting (should not happen)
    const failsafe = window.setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setVisible(false);
      onComplete?.();
    }, ms + 2500);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(failsafe);
      try {
        ctx?.revert();
      } catch {
        /* ignore */
      }
    };
  }, [onComplete, minDuration]);

  if (!visible) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2rem',
    background: '#ffffff',
  };

  const logoBoxStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '6rem',
    height: '6rem',
    borderRadius: '1rem',
    border: '2px solid rgba(6, 182, 212, 0.65)',
    background: 'rgba(6, 182, 212, 0.12)',
    fontSize: '2.25rem',
    fontWeight: 700,
    color: '#0891b2',
    boxShadow: '0 8px 32px rgba(6, 182, 212, 0.18)',
    transformOrigin: 'center',
  };

  return (
    <div ref={ref} className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-8 bg-white" style={overlayStyle}>
      <div ref={logoRef} className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-cyan-500/70 bg-cyan-500/15 text-4xl font-bold text-cyan-600 shadow-xl shadow-cyan-500/20" style={logoBoxStyle}>
        O
      </div>
      <p ref={textRef} className="font-display text-xl font-semibold text-slate-900" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
        <span ref={lettersRef} className="inline-block">
          {'Optilend'.split('').map((c, i) => (
            <span key={i} className="inline-block">{c}</span>
          ))}
        </span>
      </p>
      <div
        className="h-1 w-48 overflow-hidden rounded-full bg-slate-200"
        style={{ width: '12rem', height: '0.25rem', borderRadius: '9999px', background: '#e2e8f0', overflow: 'hidden' }}
      >
        <div
          ref={progressRef}
          className="loading-screen-progress-fill h-full w-full origin-left scale-x-0 rounded-full bg-cyan-500"
          style={{ height: '100%', width: '100%', transformOrigin: 'left center', borderRadius: '9999px', background: '#06b6d4' }}
        />
      </div>
    </div>
  );
}
