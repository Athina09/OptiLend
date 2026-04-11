'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from '@/lib/gsap';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function BankLoginPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !cardRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 30, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }
      );
      if (formRef.current) {
        const inputs = formRef.current.querySelectorAll('input');
        gsap.fromTo(inputs, { opacity: 0, x: -15 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.1, delay: 0.4, ease: 'power2.out' });
      }
    });
    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = '/bank/dashboard';
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-white">
      <div className="relative z-10 w-full max-w-md stagger-children">
        <GlassCard ref={cardRef} variant="strong" className="stagger-child p-8 sm:p-10 hover:border-cyan-500/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-cyan-500/10">
          <div className="mb-8 text-center">
            <Link href="/" className="font-display text-2xl font-bold brand-text">
              Optilend
            </Link>
            <p className="mt-2 text-slate-600 text-sm">Bank / Lender Portal</p>
          </div>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="institutional@bank.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-full">
              Login
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-600">
            RBI-Aligned. DPDP Compliant. Institutional access only.
          </p>
        </GlassCard>
        <p className="mt-6 text-center stagger-child">
          <Link href="/" className="text-sm text-cyan-600 hover:text-cyan-700 transition-colors duration-300 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
