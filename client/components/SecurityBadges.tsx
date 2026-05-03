'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

const captions = [
  { text: 'AES-256 Secured', icon: '🔒' },
  { text: 'RBI-Aligned Architecture', icon: '🛡️' },
  { text: 'DPDP Compliant', icon: '✓' },
];

export function SecurityBadges() {
  const captionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !captionsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        captionsRef.current!.children,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, delay: 1.35, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="flex w-full flex-col items-center">
      <div
        ref={captionsRef}
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-600 sm:gap-x-8"
      >
        {captions.map((row) => (
          <div key={row.text} className="flex items-center gap-2">
            <span className="text-teal-600" aria-hidden>
              {row.icon}
            </span>
            <span>{row.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
