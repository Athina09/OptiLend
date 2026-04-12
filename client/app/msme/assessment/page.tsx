'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gsap } from '@/lib/gsap';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { MSME_BUSINESS_TOKEN_KEY, hasAAConsent } from '@/lib/msme-consent';
import {
  MSME_VERIFICATION_ASSESSMENT_KEY,
  type StoredVerificationAssessment,
} from '@/lib/msme-assessment-bridge';

const SAMPLE_Q1_BY_PROFILE: { label: string; text: string }[] = [
  { label: 'Auto parts', text: 'Manufacturing of auto parts' },
  { label: 'Tailoring', text: 'Tailoring and garment production' },
  { label: 'Tech startup', text: 'Tech startup (SaaS)' },
];

const ASSESSMENT_QUESTIONS = [
  {
    id: 'q1',
    question: 'What is the primary business activity or product/service of your MSME? (Describe in one line)',
    placeholder: 'e.g. Manufacturing of auto parts',
  },
  {
    id: 'q2',
    question: 'In which year was your business/enterprise registered or started?',
    placeholder: 'e.g. 2019',
  },
  {
    id: 'q3',
    question: 'What is your approximate monthly turnover (in ₹)? Give a range if exact is not possible.',
    placeholder: 'e.g. 2 to 3 lakh',
  },
  {
    id: 'q4',
    question: 'How many people does your enterprise employ (including yourself)?',
    placeholder: 'e.g. 5',
  },
  {
    id: 'q5',
    question: 'Which city and state is your business primarily located in?',
    placeholder: 'e.g. Chennai, Tamil Nadu',
  },
];

export default function MSMEAssessmentPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(
    ASSESSMENT_QUESTIONS.reduce((acc, q) => ({ ...acc, [q.id]: '' }), {})
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    if (!localStorage.getItem(MSME_BUSINESS_TOKEN_KEY)) {
      router.replace('/msme/login');
      return;
    }
    if (!hasAAConsent()) {
      router.replace('/msme/account-aggregator-consent');
    }
  }, [mounted, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !cardRef.current || !mounted) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    });
    return () => ctx.revert();
  }, [mounted]);

  const handleChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const blockPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  const allAnswered = ASSESSMENT_QUESTIONS.every((q) => answers[q.id].trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) return;
    if (typeof window !== 'undefined') {
      try {
        const payload: StoredVerificationAssessment = {
          answers: { ...answers },
          submittedAt: Date.now(),
        };
        localStorage.setItem(MSME_VERIFICATION_ASSESSMENT_KEY, JSON.stringify(payload));
      } catch {
        /* ignore quota / private mode */
      }
    }
    router.push('/msme/dashboard');
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-white">
      <div className="relative z-10 w-full max-w-2xl">
        <GlassCard ref={cardRef} variant="strong" className="p-8 sm:p-10 hover:border-cyan-500/50 transition-all duration-300 shadow-xl shadow-slate-200/50">
          <div className="mb-6 text-center">
            <Link href="/" className="font-display text-2xl font-bold brand-text">
              Optilend
            </Link>
            <p className="mt-2 text-slate-600 text-sm">MSME Portal</p>
            <h1 className="mt-4 font-display text-xl font-semibold text-slate-900">
              Verification assessment
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Please answer the following. Type your answers (paste is disabled to verify authenticity).
            </p>
            <p className="mt-2 text-xs text-slate-500 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <strong className="text-slate-700">Credit score on the dashboard:</strong> question 1 is matched to an
              industry model (e.g. include <em>tech startup</em>, <em>SaaS</em>, <em>tailoring</em>, or{' '}
              <em>auto parts</em>) so your OptilendScore reflects that profile. Generic phrases may keep the default
              demo score until you use the scoring panel presets.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="w-full text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Judge quick-fill (question 1)
              </span>
              {SAMPLE_Q1_BY_PROFILE.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleChange('q1', s.text)}
                  className="rounded-lg border border-cyan-200 bg-cyan-50/80 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-cyan-100 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {ASSESSMENT_QUESTIONS.map((q, index) => (
              <div key={q.id} className="space-y-2">
                <label htmlFor={q.id} className="block text-sm font-semibold text-slate-800">
                  {index + 1}. {q.question}
                </label>
                <input
                  id={q.id}
                  type="text"
                  value={answers[q.id]}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  onPaste={blockPaste}
                  onCut={blockPaste}
                  placeholder={q.placeholder}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  autoComplete="off"
                  required
                />
              </div>
            ))}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:flex-1"
                disabled={!allAnswered}
              >
                Complete & go to dashboard
              </Button>
              <Link
                href="/msme/login"
                className="w-full sm:flex-1 rounded-xl border-2 border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
              >
                Back to login
              </Link>
            </div>
          </form>
        </GlassCard>
        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-cyan-600 hover:text-cyan-700 transition-colors duration-300 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
