'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { ScrollTrigger } from '@/lib/gsap';
import { GlassCard } from '@/components/ui/GlassCard';

const features = [
  { title: 'AI-Powered Scoring', desc: 'OptilendScore 300–900 for transparent credit assessment.', icon: '📊' },
  { title: 'RBI-Aligned', desc: 'Built for regulatory compliance and institutional trust.', icon: '🛡️' },
  { title: 'MSME & Bank Portals', desc: 'Dedicated experiences for borrowers and lenders.', icon: '🔐' },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !sectionRef.current || !cardsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.registerPlugin(ScrollTrigger);
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 85%' },
          }
        );
      }
      const cards = Array.from(cardsRef.current!.children);
      gsap.fromTo(
        cards,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
      cards.forEach((card, i) => {
        const icon = card.querySelector('.feature-icon');
        if (icon) {
          gsap.fromTo(
            icon,
            { scale: 0.5, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.5,
              delay: 0.2 + i * 0.15,
              ease: 'back.out(1.5)',
              scrollTrigger: { trigger: card, start: 'top 90%' },
            }
          );
        }
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative z-20 w-full max-w-5xl px-6 py-24">
      <h2 ref={titleRef} className="font-display text-2xl font-bold text-center text-slate-900 mb-4">
        Why Optilend
      </h2>
      <p className="text-center text-cyan-600 text-sm mb-12">Trusted by MSMEs and lenders</p>
      <div ref={cardsRef} className="grid gap-6 sm:grid-cols-3">
        {features.map((f, i) => (
          <GlassCard
            key={i}
            className="p-6 text-center hover:border-teal-500/50 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-cyan-500/10 group"
          >
            <span className="feature-icon text-3xl mb-3 block inline-block group-hover:scale-110 group-hover:animate-wiggle transition-transform duration-300">
              {f.icon}
            </span>
            <h3 className="font-display font-semibold text-slate-800 mb-2">{f.title}</h3>
            <p className="text-sm text-slate-600">{f.desc}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
