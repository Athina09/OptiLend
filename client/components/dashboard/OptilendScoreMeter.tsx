'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

interface OptilendScoreMeterProps {
  /** null = still fetching from scoring layer (avoid showing a fake default score) */
  score: number | null;
}

const MIN = 300;
const MAX = 900;
const circumference = 2 * Math.PI * 54;
const strokeWidth = 8;

export function OptilendScoreMeter({ score }: OptilendScoreMeterProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef<number | null>(null);

  const normalized =
    score === null ? MIN : Math.max(MIN, Math.min(MAX, score));
  const fraction = score === null ? 0 : (normalized - MIN) / (MAX - MIN);
  const strokeDashoffset = circumference * (1 - fraction);

  useEffect(() => {
    if (score === null) return;
    if (typeof window === 'undefined' || !valueRef.current || !circleRef.current || !containerRef.current) return;

    const prev = prevScoreRef.current;
    const n = normalized;

    if (prev === null) {
      gsap.fromTo(containerRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' });
      gsap.fromTo(valueRef.current, { textContent: MIN }, { textContent: n, duration: 1.5, snap: { textContent: 1 }, ease: 'power2.out', delay: 0.2 });
      gsap.fromTo(circleRef.current, { strokeDashoffset: circumference }, { strokeDashoffset, duration: 1.2, ease: 'power2.out', delay: 0.1 });
    } else if (prev !== n) {
      const prevNorm = Math.max(MIN, Math.min(MAX, prev));
      const prevFraction = (prevNorm - MIN) / (MAX - MIN);
      const fromOffset = circumference * (1 - prevFraction);
      gsap.fromTo(valueRef.current, { textContent: prev }, { textContent: n, duration: 0.85, snap: { textContent: 1 }, ease: 'power2.out' });
      gsap.fromTo(circleRef.current, { strokeDashoffset: fromOffset }, { strokeDashoffset, duration: 0.85, ease: 'power2.out' });
      gsap.fromTo(containerRef.current, { scale: 1 }, { scale: 1.04, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    }

    prevScoreRef.current = n;
  }, [normalized, score]);

  if (score === null) {
    return (
      <div
        className="relative inline-flex h-36 w-36 items-center justify-center"
        aria-busy="true"
        aria-label="Loading credit score"
      >
        <svg className="absolute inset-0 h-36 w-36 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200"
          />
        </svg>
        <span className="relative text-lg font-semibold text-slate-400">…</span>
      </div>
    );
  }

  const color = fraction >= 0.7 ? '#14b8a6' : fraction >= 0.4 ? '#06b6d4' : '#f59e0b';

  return (
    <div ref={containerRef} className="relative inline-flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700"
        />
        <circle
          ref={circleRef}
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="transition-colors duration-500"
        />
      </svg>
      <span
        ref={valueRef}
        className="absolute text-3xl font-bold text-slate-900 font-display"
      >
        {score}
      </span>
    </div>
  );
}
