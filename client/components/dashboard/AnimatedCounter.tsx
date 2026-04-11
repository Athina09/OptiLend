'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  duration?: number;
}

export function AnimatedCounter({ value, suffix = '', duration = 1 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;
    gsap.fromTo(
      ref.current,
      { textContent: 0 },
      { textContent: value, duration, snap: { textContent: 1 }, ease: 'power2.out' }
    );
  }, [value, duration]);

  return (
    <span>
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
}
