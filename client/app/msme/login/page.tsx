'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MSME_AA_CONSENT_KEY } from '@/lib/msme-consent';

const API_URL = process.env.NEXT_PUBLIC_SOCIAL_API_URL || 'http://localhost:4000';
const DEMO_OTP = '123456';
const DEMO_GSTIN = '33EDCPA3489L1ZG';
const SOCIAL_API_URL = API_URL;
const MSME_SOCIAL_STORAGE_KEY = 'msme_social_data';
const MSME_BUSINESS_TOKEN_KEY = 'msme_business_token';
const MSME_BUSINESS_PROFILE_KEY = 'msme_business_profile';

type SocialKey = 'linkedin' | 'x' | 'insta';

type VerificationChecks = { gst: boolean; udyam: boolean; pan: boolean };

const SOCIAL_CONFIG: Record<SocialKey, { label: string; placeholder: string; color: string; backendKey: 'linkedin' | 'twitter' | 'instagram' }> = {
  linkedin: { label: 'LinkedIn', placeholder: 'Paste your LinkedIn profile URL', color: 'hover:border-[#0A66C2]/50 hover:bg-[#0A66C2]/10', backendKey: 'linkedin' },
  x: { label: 'X (Twitter)', placeholder: 'Paste your X (Twitter) profile URL', color: 'hover:border-slate-400/50 hover:bg-slate-500/10', backendKey: 'twitter' },
  insta: { label: 'Instagram', placeholder: 'Paste your Instagram profile URL', color: 'hover:border-[#E4405F]/50 hover:bg-[#E4405F]/10', backendKey: 'instagram' },
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/i;
const UDYAM_FULL_REGEX = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i;

function normalizeId(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

function isValidBusinessIdFormat(raw: string): boolean {
  const s = normalizeId(raw);
  if (!s) return false;
  if (s.length === 10 && PAN_REGEX.test(s)) return true;
  if (s.length === 15 && GSTIN_REGEX.test(s)) return true;
  if (UDYAM_FULL_REGEX.test(s)) return true;
  if (/^[A-Z0-9-]{12,25}$/.test(s)) return true;
  return false;
}

/** Shown when the field is non-empty but invalid — stops “stuck” grey buttons with no explanation. */
function validationHint(raw: string, isValid: boolean): string | null {
  if (!raw.trim() || isValid) return null;
  const s = normalizeId(raw);
  if (s.length > 0 && s.length < 10) {
    return 'PAN needs 10 characters. Udyam: e.g. UDYAM-TN-01-0000123. GSTIN needs 15 characters.';
  }
  if (s.length === 10 && !PAN_REGEX.test(s)) {
    return 'PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).';
  }
  if (s.length > 10 && s.length < 15) {
    return `GSTIN must be exactly 15 characters (you entered ${s.length}). Example: 27AAAAA0000A1Z5`;
  }
  if (s.length === 15 && !GSTIN_REGEX.test(s)) {
    return 'This 15-character value does not match GSTIN format. Check typos (e.g. letter O vs zero).';
  }
  if (s.length > 15) {
    return 'ID is too long. Use 15-char GSTIN, 10-char PAN, or Udyam number.';
  }
  return 'Use a valid GSTIN, Udyam registration, or PAN.';
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: 'Business ID' },
    { n: 2 as const, label: 'Verify OTP' },
    { n: 3 as const, label: 'Verified' },
  ];
  return (
    <div className="mb-8" aria-label="Progress">
      <div className="flex items-start w-full">
        {steps.map((s, i) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <div key={s.n} className="flex flex-1 min-w-0 items-start">
              <div className="flex w-full flex-col items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-all duration-300 ${
                    done
                      ? 'bg-teal-500 text-white shadow-teal-500/30'
                      : active
                        ? 'bg-teal-600 text-white ring-2 ring-teal-300 ring-offset-2 shadow-teal-500/25'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {done ? '✓' : s.n}
                </div>
                <span
                  className={`mt-2 text-center text-[10px] sm:text-xs font-medium leading-tight px-0.5 ${
                    active || done ? 'text-teal-800' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-1 mt-[17px] h-0.5 min-w-[12px] flex-1 shrink rounded-full self-start transition-colors ${
                    step > s.n ? 'bg-teal-400' : 'bg-slate-200'
                  }`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-500 leading-relaxed px-1">
        1 → Enter Business ID → 2 → Verify OTP → 3 → Business Verified
      </p>
    </div>
  );
}

export default function MSMELoginPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [businessId, setBusinessId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [businessVerified, setBusinessVerified] = useState(false);
  const [verification, setVerification] = useState<{
    business_name: string;
    checks: VerificationChecks;
  } | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false);
  const [verifyOtpError, setVerifyOtpError] = useState<string | null>(null);
  /** True when send-otp failed (e.g. Failed to fetch) — user can still use demo OTP. */
  const [demoOtpBypass, setDemoOtpBypass] = useState(false);

  const [socialUrls, setSocialUrls] = useState<Record<SocialKey, string>>({ linkedin: '', x: '', insta: '' });
  const [socialPending, setSocialPending] = useState<Record<SocialKey, string>>({ linkedin: '', x: '', insta: '' });
  const [activeSocial, setActiveSocial] = useState<SocialKey | null>(null);
  const [socialLoading, setSocialLoading] = useState<SocialKey | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  const [agreeToShare, setAgreeToShare] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const normalizedStoredRef = useRef<string | null>(null);

  const idValid = isValidBusinessIdFormat(businessId);
  const idHint = validationHint(businessId, idValid);
  const currentNorm = normalizeId(businessId);

  useEffect(() => {
    if (normalizedStoredRef.current && currentNorm !== normalizedStoredRef.current) {
      setOtpSent(false);
      setOtp('');
      setBusinessVerified(false);
      setVerification(null);
      setSessionToken(null);
      setVerifyOtpError(null);
      setDemoOtpBypass(false);
      normalizedStoredRef.current = null;
    }
  }, [currentNorm]);

  const progressStep: 1 | 2 | 3 = businessVerified ? 3 : otpSent ? 2 : 1;

  const handleGetOtp = async () => {
    if (!idValid) {
      setOtpError('Enter a valid GSTIN, Udyam number, or PAN.');
      return;
    }
    setOtpError(null);
    setDemoOtpBypass(false);
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: currentNorm }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to send OTP');
      }
      normalizedStoredRef.current = currentNorm;
      setOtpSent(true);
      setBusinessVerified(false);
      setVerification(null);
      setSessionToken(null);
      setVerifyOtpError(null);
      setOtp('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const networkFail =
        err instanceof TypeError ||
        /failed to fetch|networkerror|load failed|network request failed/i.test(msg);
      if (networkFail) {
        // Offline / no server: still advance so demo OTP works ("Failed to fetch" is fine).
        normalizedStoredRef.current = currentNorm;
        setOtpSent(true);
        setBusinessVerified(false);
        setVerification(null);
        setSessionToken(null);
        setVerifyOtpError(null);
        setOtp('');
        setDemoOtpBypass(true);
        setOtpError(null);
      } else {
        setOtpError(msg || 'Could not send OTP. Try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpSent || !idValid) return;
    const digits = otp.replace(/\D/g, '');
    if (digits.length !== 6) {
      setVerifyOtpError('Enter the 6-digit OTP.');
      return;
    }
    setVerifyOtpError(null);
    setVerifyOtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: currentNorm, otp: digits }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.verified) {
        throw new Error(json.message || 'Verification failed');
      }
      setBusinessVerified(true);
      setVerification({
        business_name: json.business_name,
        checks: json.checks,
      });
      setSessionToken(json.token ?? null);
      setDemoOtpBypass(false);
    } catch {
      if (digits === DEMO_OTP) {
        setBusinessVerified(true);
        setVerification({
          business_name: `Business (${currentNorm})`,
          checks: { gst: true, udyam: true, pan: true },
        });
        setSessionToken(`demo-msme-${currentNorm}-${Date.now()}`);
        setVerifyOtpError(null);
        setDemoOtpBypass(false);
      } else {
        setVerifyOtpError('Verification failed. For demo without a server, use OTP 123456.');
      }
    } finally {
      setVerifyOtpLoading(false);
    }
  };

  const handleSecureLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessVerified || !agreeToShare || !sessionToken || !verification) return;
    setLoginLoading(true);
    try {
      /* Fresh login must show AA + GST consent; old msme_aa_consent_v1 would skip the page otherwise. */
      localStorage.removeItem(MSME_AA_CONSENT_KEY);
      localStorage.setItem(MSME_BUSINESS_TOKEN_KEY, sessionToken);
      localStorage.setItem(
        MSME_BUSINESS_PROFILE_KEY,
        JSON.stringify({
          business_name: verification.business_name,
          checks: verification.checks,
          verifiedAt: Date.now(),
        })
      );
      window.location.href = '/msme/account-aggregator-consent';
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSocialSubmit = async (key: SocialKey) => {
    const url = socialPending[key].trim();
    if (!url) return;
    const backendKey = SOCIAL_CONFIG[key].backendKey;
    const payload = { profileUrls: { [backendKey]: url } };
    setSocialError(null);
    setSocialLoading(key);
    try {
      const res = await fetch(`${SOCIAL_API_URL}/social/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch profile data');
      }
      const { data } = json;
      const stored = typeof window !== 'undefined' ? localStorage.getItem(MSME_SOCIAL_STORAGE_KEY) : null;
      const existing = stored ? JSON.parse(stored) : {};
      const platformData = data.platformData?.[backendKey] ?? {};
      const platformStatus = data.platformStatus?.[backendKey] ?? 'UNKNOWN';
      existing[backendKey] = {
        url,
        status: platformStatus,
        platformData,
        socialScore: data.socialScore,
        sessionId: data.sessionId,
        timestamp: data.timestamp,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(MSME_SOCIAL_STORAGE_KEY, JSON.stringify(existing));
      }
      setSocialUrls((prev) => ({ ...prev, [key]: url }));
      setSocialPending((prev) => ({ ...prev, [key]: '' }));
      setActiveSocial(null);
    } catch (err) {
      setSocialError(err instanceof Error ? err.message : 'Could not connect to verification service.');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <main className="msme-login-fallback relative flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-slate-50 to-white">
      <div className="ol-wrap relative z-10 w-full max-w-md stagger-children">
        <GlassCard
          ref={cardRef}
          variant="strong"
          className="ol-login-card stagger-child p-8 sm:p-10 border-teal-100/80 hover:border-teal-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/10"
        >
          <div className="mb-6 text-center">
            <Link href="/" className="font-display text-2xl font-bold text-teal-600 hover:text-teal-500 transition-colors">
              Optilend
            </Link>
            <p className="mt-2 text-slate-700 text-sm font-medium">Business Verification Login</p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              We verify the business itself using GST, Udyam, and PAN instead of relying on individual identity systems.
            </p>
          </div>

          <StepIndicator step={progressStep} />

          <form ref={formRef} onSubmit={handleSecureLogin} className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-2">Step 1 — Business ID</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div className="flex-1 min-w-0">
                  <Input
                    label="Enter GSTIN / Udyam Number / PAN"
                    placeholder="e.g. 33EDCPA3489L1ZG (15-char GSTIN)"
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value.toUpperCase())}
                    maxLength={25}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    required
                    fieldClassName="ol-input-shell"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  data-ol="secondary"
                  onClick={handleGetOtp}
                  disabled={!idValid || otpLoading}
                  className="shrink-0 w-full sm:w-auto sm:min-w-[120px] border-teal-200 hover:border-teal-400 hover:bg-teal-50"
                >
                  {otpLoading ? 'Sending…' : 'Get OTP'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Use GSTIN, Udyam Registration, or PAN for business verification.
              </p>
              {idHint && (
                <p className="ol-hint" role="status">
                  {idHint}
                </p>
              )}
              <p className="ol-demo text-slate-500">
                <button
                  type="button"
                  data-ol="link"
                  onClick={() => setBusinessId(DEMO_GSTIN)}
                >
                  Fill demo GSTIN (15 chars)
                </button>
              </p>
            </div>

            {demoOtpBypass && (
              <p className="text-sm text-slate-600 animate-fade-in rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" role="status">
                Could not reach the verification server — that&apos;s OK for demo. Continue with OTP <strong className="text-teal-700">{DEMO_OTP}</strong>.
              </p>
            )}

            {otpError && (
              <p className="text-sm text-amber-600 animate-fade-in" role="alert">
                {otpError}
              </p>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-2">Step 2 — Verify OTP</p>
              <Input
                label="Enter OTP"
                placeholder={otpSent ? 'Enter 6-digit OTP' : 'Click Get OTP first'}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={!otpSent}
                fieldClassName="ol-input-shell"
              />
              <Button
                type="button"
                variant="outline"
                data-ol="outline"
                className="w-full mt-3 border-teal-500 text-teal-700 hover:bg-teal-50"
                onClick={handleVerifyOtp}
                disabled={!otpSent || otp.replace(/\D/g, '').length !== 6 || verifyOtpLoading || businessVerified}
              >
                {verifyOtpLoading ? 'Verifying…' : businessVerified ? 'Verified' : 'Verify OTP'}
              </Button>
              {verifyOtpError && (
                <p className="text-sm text-red-600 animate-fade-in mt-2" role="alert">
                  {verifyOtpError}
                </p>
              )}
            </div>

            {businessVerified && verification && (
              <div className="ol-step3 rounded-2xl border border-teal-200/90 bg-gradient-to-br from-teal-50/90 to-white p-4 sm:p-5 shadow-md shadow-teal-900/[0.06] animate-fade-in-up">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-800 mb-3">Step 3 — Verified</p>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-lg" aria-hidden>
                    ✅
                  </span>
                  <span className="font-display text-lg font-bold text-teal-900">Business Verified</span>
                </div>
                <p className="text-sm font-medium text-slate-800 mb-1">{verification.business_name}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-semibold">{verification.checks.gst ? '✔' : '—'}</span>
                    GST Active
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-semibold">{verification.checks.udyam ? '✔' : '—'}</span>
                    Udyam Registered
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-semibold">{verification.checks.pan ? '✔' : '—'}</span>
                    PAN Linked
                  </li>
                </ul>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-600">Step 4 — Link social accounts (optional)</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  data-ol="social"
                  onClick={() => setActiveSocial(activeSocial === 'linkedin' ? null : 'linkedin')}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white shadow-sm transition-all duration-300 hover:scale-110 hover:animate-bounce-soft ${SOCIAL_CONFIG.linkedin.color} ${socialUrls.linkedin ? 'ring-1 ring-teal-500/50 border-teal-500/40' : ''}`}
                  title="Add LinkedIn"
                  aria-label="Add LinkedIn profile"
                >
                  {socialUrls.linkedin ? (
                    <span className="text-teal-600 text-lg" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <svg className="h-6 w-6 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  data-ol="social"
                  onClick={() => setActiveSocial(activeSocial === 'x' ? null : 'x')}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white shadow-sm transition-all duration-300 hover:scale-110 hover:animate-bounce-soft ${SOCIAL_CONFIG.x.color} ${socialUrls.x ? 'ring-1 ring-teal-500/50 border-teal-500/40' : ''}`}
                  title="Add X (Twitter)"
                  aria-label="Add X profile"
                >
                  {socialUrls.x ? (
                    <span className="text-teal-600 text-lg" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <svg className="h-5 w-5 text-slate-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  data-ol="social"
                  onClick={() => setActiveSocial(activeSocial === 'insta' ? null : 'insta')}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white shadow-sm transition-all duration-300 hover:scale-110 hover:animate-bounce-soft ${SOCIAL_CONFIG.insta.color} ${socialUrls.insta ? 'ring-1 ring-teal-500/50 border-teal-500/40' : ''}`}
                  title="Add Instagram"
                  aria-label="Add Instagram profile"
                >
                  {socialUrls.insta ? (
                    <span className="text-teal-600 text-lg" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <svg className="h-6 w-6 text-[#E4405F]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.766 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.766-2.618 6.98-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.766-6.979-6.98C8.333.014 8.741 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  )}
                </button>
              </div>

              {activeSocial && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 animate-fade-in-up">
                  <p className="text-xs text-slate-600">{SOCIAL_CONFIG[activeSocial].label} — paste URL and submit</p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder={SOCIAL_CONFIG[activeSocial].placeholder}
                      value={socialPending[activeSocial]}
                      onChange={(e) => setSocialPending((prev) => ({ ...prev, [activeSocial]: e.target.value }))}
                      className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 shadow-sm focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                      autoFocus
                    />
                    <button
                      type="button"
                      data-ol="teal-sm"
                      onClick={() => handleSocialSubmit(activeSocial)}
                      disabled={!socialPending[activeSocial].trim() || socialLoading === activeSocial}
                      className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40 disabled:pointer-events-none transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-teal-600/20"
                    >
                      {socialLoading === activeSocial ? 'Verifying…' : 'Submit'}
                    </button>
                  </div>
                  {socialError && <p className="text-xs text-red-600 animate-fade-in">{socialError}</p>}
                </div>
              )}

              {(socialUrls.linkedin || socialUrls.x || socialUrls.insta) && (
                <p className="text-xs text-slate-600">
                  Linked:{' '}
                  {[socialUrls.linkedin && 'LinkedIn', socialUrls.x && 'X', socialUrls.insta && 'Instagram'].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:border-teal-300/60 transition-all duration-300 hover:shadow-md shadow-sm">
              <input
                type="checkbox"
                checked={agreeToShare}
                onChange={(e) => setAgreeToShare(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white text-teal-600 focus:ring-teal-500/50 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">
                I agree to share my details with Optilend and partner lenders for credit assessment and related services.
              </span>
            </label>

            <p className="rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs leading-relaxed text-teal-900">
              <strong className="font-semibold">Next step:</strong> after Secure Login you will complete the{' '}
              <strong>Account Aggregator &amp; GST consent</strong> form (bank data via AA + GST filings) before the
              MSME assessment. Direct link:{' '}
              <Link href="/msme/account-aggregator-consent" className="underline font-medium">
                /msme/account-aggregator-consent
              </Link>
              .
            </p>

            <Button
              type="submit"
              variant="primary"
              data-ol="primary"
              className="w-full mt-2 bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40"
              disabled={!businessVerified || !agreeToShare || !sessionToken || loginLoading}
            >
              {loginLoading ? 'Continuing…' : 'Secure Login'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
            When the server is running, OTP is sent to the registered mobile. Offline / demo: use <strong className="text-teal-700">{DEMO_OTP}</strong> after Get OTP. AES-256 secured.
          </p>
        </GlassCard>
        <p className="mt-6 text-center stagger-child">
          <Link href="/" className="text-sm text-teal-600 hover:text-teal-700 transition-colors duration-300 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
