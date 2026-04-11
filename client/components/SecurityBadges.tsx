'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

const badges = [
  { text: 'AES-256 Secured', icon: '🔒' },
  { text: 'RBI-Aligned Architecture', icon: '🛡️' },
  { text: 'DPDP Compliant', icon: '✓' },
];

export function SecurityBadges() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current!.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.15, delay: 1.2, ease: 'power2.out' }
      );
      if (iconRef.current) {
        gsap.fromTo(
          iconRef.current,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, delay: 0.8, ease: 'back.out(1.2)' }
        );
        gsap.to(iconRef.current, {
          scale: 1.05,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 2,
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
      <div
        ref={iconRef}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-teal-500/50 bg-teal-500/20 text-2xl animate-pulse-soft"
        aria-hidden
      >
        🛡️
      </div>
      {badges.map((badge) => (
        <div
          key={badge.text}
          className="flex items-center gap-2 text-slate-600 text-sm font-medium"
        >
          <span className="text-teal-600">{badge.icon}</span>
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  );
}
