'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { Button } from '@/components/ui/Button';

export function HeroSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement>(null);
  const brandRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctx = gsap.context(() => {
      if (headlineRef.current) {
        gsap.fromTo(
          headlineRef.current,
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 1, delay: 0.3, ease: 'power3.out' }
        );
      }
      if (charsRef.current) {
        const chars = charsRef.current.querySelectorAll('.char');
        gsap.fromTo(
          chars,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.03, delay: 0.6, ease: 'power2.out' }
        );
      }
      if (brandRef.current) {
        gsap.fromTo(
          brandRef.current,
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.6, delay: 0.9, ease: 'back.out(1.4)' }
        );
      }
      if (underlineRef.current) {
        gsap.fromTo(
          underlineRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.5, delay: 1.1, ease: 'power2.out', transformOrigin: 'left' }
        );
      }
      if (subtextRef.current) {
        gsap.fromTo(
          subtextRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7, delay: 1, ease: 'power2.out' }
        );
      }
      if (buttonsRef.current) {
        const btns = buttonsRef.current.querySelectorAll('a, button');
        gsap.fromTo(
          btns,
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, delay: 1.2, ease: 'power2.out' }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  const headline = 'AI-Powered Alternative Credit Intelligence for MSMEs';
  const words = headline.split(' ');

  return (
    <section className="text-center">
      <h1
        ref={headlineRef}
        className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-slate-900"
      >
        <span ref={charsRef} className="inline-block">
          {words.map((word, i) => (
            <span key={i} className="inline-block mr-[0.25em]">
              {word.split('').map((char, j) => (
                <span key={j} className="char inline-block">
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </span>
          ))}
        </span>
        <br />
        <span ref={brandRef} className="brand-text inline-block relative pb-1">
          Optilend
          <span
            ref={underlineRef}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 origin-left rounded-full"
          />
        </span>
      </h1>
      <p
        ref={subtextRef}
        className="mt-6 text-lg text-cyan-600 sm:text-xl md:text-2xl font-medium"
      >
        Secure. Transparent. RBI-Aligned.
      </p>
      <div
        ref={buttonsRef}
        className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <Button href="/msme/login" variant="primary" className="min-w-[200px]">
          Login as MSME
        </Button>
        <Button href="/bank/login" variant="secondary" className="min-w-[200px]">
          Login as Bank
        </Button>
      </div>
    </section>
  );
}
