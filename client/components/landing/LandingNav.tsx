'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from '@/lib/gsap';

export function LandingNav() {
  const ref = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.2 });
      if (logoRef.current) gsap.fromTo(logoRef.current, { x: -25, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, delay: 0.4, ease: 'power2.out' });
      if (linksRef.current) {
        const children = linksRef.current.querySelectorAll('a');
        gsap.fromTo(children, { y: -15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, delay: 0.5, ease: 'power2.out' });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <nav
      ref={ref}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200 px-6 py-4"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link
          ref={logoRef}
          href="/"
          className="font-display text-xl font-bold text-cyan-500 hover:text-cyan-400 transition-colors duration-300"
        >
          Optilend
        </Link>
        <div ref={linksRef} className="flex items-center gap-6">
          <Link
            href="/msme/login"
            className="text-sm font-medium text-slate-600 hover:text-cyan-600 transition-all duration-300 hover:-translate-y-0.5"
          >
            MSME Login
          </Link>
          <Link
            href="/bank/login"
            className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-all duration-300 hover:-translate-y-0.5"
          >
            Bank Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
