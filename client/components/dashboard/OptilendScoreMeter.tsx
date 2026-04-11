'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

interface OptilendScoreMeterProps {
  score: number; // 300–900
}

const MIN = 300;
const MAX = 900;
const circumference = 2 * Math.PI * 54;
const strokeWidth = 8;

export function OptilendScoreMeter({ score }: OptilendScoreMeterProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalized = Math.max(MIN, Math.min(MAX, score));
  const fraction = (normalized - MIN) / (MAX - MIN);
  const strokeDashoffset = circumference * (1 - fraction);

  useEffect(() => {
    if (typeof window === 'undefined' || !valueRef.current || !circleRef.current || !containerRef.current) return;
    gsap.fromTo(containerRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.2)' });
    gsap.fromTo(valueRef.current, { textContent: MIN }, { textContent: score, duration: 1.5, snap: { textContent: 1 }, ease: 'power2.out', delay: 0.2 });
    gsap.fromTo(circleRef.current, { strokeDashoffset: circumference }, { strokeDashoffset, duration: 1.2, ease: 'power2.out', delay: 0.1 });
  }, [score, strokeDashoffset]);

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
