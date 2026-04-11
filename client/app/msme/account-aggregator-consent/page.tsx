'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  MSME_AA_CONSENT_KEY,
  MSME_BUSINESS_TOKEN_KEY,
  hasAAConsent,
  parseAAConsent,
  type AAConsentRecord,
} from '@/lib/msme-consent';

const CONSENT_VERSION = 1 as const;

export default function AccountAggregatorConsentPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [scopeAA, setScopeAA] = useState(false);
  const [scopeGst, setScopeGst] = useState(false);
  const [scopeLink, setScopeLink] = useState(false);
  const [ackRbi, setAckRbi] = useState(false);
  const [ackRevoke, setAckRevoke] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setReviewOnly(new URLSearchParams(window.location.search).get('review') === '1');
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    if (!localStorage.getItem(MSME_BUSINESS_TOKEN_KEY)) {
      router.replace('/msme/login');
      return;
    }
    if (hasAAConsent() && !reviewOnly) {
      router.replace('/msme/assessment');
    }
  }, [mounted, router, reviewOnly]);

  const canSubmit =
    signerName.trim().length >= 2 &&
    scopeAA &&
    scopeGst &&
    scopeLink &&
    ackRbi &&
    ackRevoke;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || typeof window === 'undefined') return;
    setSubmitting(true);
    try {
      const record: AAConsentRecord = {
        version: CONSENT_VERSION,
        acceptedAt: Date.now(),
        signerName: signerName.trim(),
        scopes: {
          aaFinancial: scopeAA,
          gstFilings: scopeGst,
          bankWithGst: scopeLink,
        },
      };
      localStorage.setItem(MSME_AA_CONSENT_KEY, JSON.stringify(record));
      router.push('/msme/assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawDemo = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(MSME_AA_CONSENT_KEY);
    window.location.href = '/msme/account-aggregator-consent';
  };

  const existing = mounted ? parseAAConsent() : null;

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (reviewOnly && existing) {
    const when = new Date(existing.acceptedAt).toLocaleString();
    return (
      <main className="relative flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 sm:py-14 bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
        <div className="relative z-10 w-full max-w-2xl">
          <GlassCard variant="strong" className="border-teal-100/80 p-6 sm:p-9 shadow-xl shadow-teal-900/[0.06]">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Account Aggregator &amp; GST</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-slate-900">Consent on file</h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Signed by <strong className="text-slate-800">{existing.signerName}</strong> on {when}. Scopes: AA financial
              data, GST filings, combined bank–GST analysis (demo).
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button variant="primary" className="bg-teal-600 hover:bg-teal-500" href="/msme/dashboard">
                Back to dashboard
              </Button>
              <Button variant="secondary" type="button" onClick={handleWithdrawDemo}>
                Clear demo consent &amp; sign again
              </Button>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Production apps use audited consent logs; this is browser-only for the hackathon demo.
            </p>
          </GlassCard>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center px-4 py-10 sm:px-6 sm:py-14 bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="relative z-10 w-full max-w-2xl">
        <GlassCard
          variant="strong"
          className="border-teal-100/80 p-6 sm:p-9 shadow-xl shadow-teal-900/[0.06]"
        >
          <div className="mb-6 text-center sm:text-left">
            <Link
              href="/"
              className="font-display text-xl font-bold text-teal-600 hover:text-teal-500 transition-colors"
            >
              Optilend
            </Link>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
              Account Aggregator &amp; GST — consent
            </p>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
              Consent to access bank-linked information via GST context
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Under the RBI Account Aggregator (AA) framework, financial information from your bank accounts can
              only be shared with your explicit consent. For Optilend&apos;s alternative credit assessment, we also
              use your <strong className="font-medium text-slate-800">GST filings</strong> (e.g. GSTR-1, GSTR-3B) to
              verify business activity and align banking patterns with declared turnover — in line with our
              RBI-aligned demo flow.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Route: <code className="rounded bg-slate-100 px-1">/msme/account-aggregator-consent</code> — short link:{' '}
              <Link href="/msme/aa-consent" className="text-teal-600 underline">
                /msme/aa-consent
              </Link>
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-xs leading-relaxed text-amber-950">
            <strong className="font-semibold">Demo notice:</strong> This screen records consent in your browser only.
            Production use requires a licensed FIU/AA integration, a signed consent artefact, and legal review.
            Each <strong>Secure Login</strong> clears the previous demo consent so this step always appears before the
            verification assessment.
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
              <legend className="px-1 text-sm font-semibold text-slate-800">
                I authorise the following (required)
              </legend>

              <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent p-2 hover:bg-white/80">
                <input
                  type="checkbox"
                  checked={scopeAA}
                  onChange={(e) => setScopeAA(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700 leading-snug">
                  I consent to <strong className="text-slate-900">Optilend</strong> requesting and receiving my{' '}
                  <strong className="text-slate-900">financial information</strong> from my bank(s) through a{' '}
                  <strong className="text-slate-900">RBI-licensed Account Aggregator</strong>, solely for credit
                  assessment and underwriting related to my MSME application.
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent p-2 hover:bg-white/80">
                <input
                  type="checkbox"
                  checked={scopeGst}
                  onChange={(e) => setScopeGst(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700 leading-snug">
                  I consent to Optilend accessing and processing <strong className="text-slate-900">GST return data</strong>{' '}
                  and related filing metadata (including where available GSTR-1 / GSTR-3B summaries) for the business
                  verified at login, to support fraud checks, turnover consistency, and eligibility modelling.
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent p-2 hover:bg-white/80">
                <input
                  type="checkbox"
                  checked={scopeLink}
                  onChange={(e) => setScopeLink(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700 leading-snug">
                  I understand that <strong className="text-slate-900">bank transaction patterns</strong> may be
                  reviewed together with <strong className="text-slate-900">GST-reported revenue signals</strong> to
                  produce a holistic view of business health (demo scoring only).
                </span>
              </label>
            </fieldset>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={ackRbi}
                  onChange={(e) => setAckRbi(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700 leading-snug">
                  I acknowledge that AA-based data fetch is subject to RBI rules, FIP/FIU participation, and my
                  consent may be logged with timestamps for audit (where implemented).
                </span>
              </label>
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={ackRevoke}
                  onChange={(e) => setAckRevoke(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-700 leading-snug">
                  I understand I may <strong className="text-slate-900">withdraw consent</strong> as permitted by
                  applicable regulations, and that withdrawal may affect continued use of credit features on Optilend.
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="signer" className="block text-sm font-semibold text-slate-800 mb-2">
                Authorised signatory name (as per business records)
              </label>
              <input
                id="signer"
                type="text"
                autoComplete="name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                required
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit || submitting}
                className="w-full sm:w-auto min-w-[200px] bg-teal-600 hover:bg-teal-500"
              >
                {submitting ? 'Saving…' : 'I agree — continue to assessment'}
              </Button>
              <Link
                href="/msme/login"
                className="text-center text-sm font-medium text-slate-600 hover:text-teal-700 sm:text-left"
              >
                Back to login
              </Link>
            </div>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}
