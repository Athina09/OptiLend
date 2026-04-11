'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gsap } from '@/lib/gsap';
import { hasAAConsent, MSME_BUSINESS_TOKEN_KEY, parseAAConsent } from '@/lib/msme-consent';
import { GlassCard } from '@/components/ui/GlassCard';
import { OptilendScoreMeter } from '@/components/dashboard/OptilendScoreMeter';
import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter';
import { AppHeader } from '@/components/AppHeader';
import { Chatbot } from '@/components/msme/Chatbot';

const SOCIAL_API_URL = process.env.NEXT_PUBLIC_SOCIAL_API_URL || 'http://localhost:4000';
const MSME_SOCIAL_STORAGE_KEY = 'msme_social_data';

type StoredSocialEntry = {
  url: string;
  status: string;
  platformData: Record<string, unknown>;
  socialScore?: number;
  sessionId?: string;
  timestamp?: string;
};

type LoanScheme = {
  id: string;
  name: string;
  type: string;
  scheme: string;
  shortDesc: string;
  fit: 'High' | 'Medium' | 'Low';
  color: 'teal' | 'cyan' | 'amber';
  details: {
    eligibility: string[];
    interestRate: string;
    tenure: string;
    maxAmount: string;
    documents: string[];
    description: string;
  };
};

const LOAN_SCHEMES: LoanScheme[] = [
  {
    id: 'working-capital',
    name: 'Working Capital Loan',
    type: 'Working Capital',
    scheme: 'CGTMSE-backed',
    shortDesc: 'For day-to-day operations, inventory and receivables.',
    fit: 'High',
    color: 'teal',
    details: {
      eligibility: ['Registered MSME (Udyam)', 'Minimum 2 years in business', 'Turnover as per scheme limits'],
      interestRate: '10.5%–18% p.a. (based on credit profile)',
      tenure: 'Up to 10 years (revolving for OD)',
      maxAmount: 'Up to ₹2 Cr (CGTMSE cover up to ₹2 Cr without collateral)',
      documents: ['Udyam certificate', 'GST registration', 'Bank statements (12 months)', 'IT returns', 'Projected cash flow'],
      description: 'Working capital loans help you manage daily operations—raw material, wages, rent, and short-term expenses. Overdraft (OD) and cash credit (CC) are common variants. CGTMSE-backed loans reduce collateral requirements for eligible MSMEs.',
    },
  },
  {
    id: 'term-loan',
    name: 'Term Loan (Equipment & Machinery)',
    type: 'Term Loan',
    scheme: 'MSME 59 Minutes / PSB Loans',
    shortDesc: 'For purchasing machinery, equipment or expansion.',
    fit: 'High',
    color: 'cyan',
    details: {
      eligibility: ['Udyam registered', 'Viable project and repayment capacity', 'No default in last 12 months'],
      interestRate: '9%–15% p.a.',
      tenure: '1–7 years (depending on asset life)',
      maxAmount: 'Up to ₹5 Cr (scheme limits apply)',
      documents: ['Quotation for machinery/equipment', 'Udyam certificate', 'Financial statements', 'Property papers if mortgage'],
      description: 'Term loans are used for buying fixed assets like machinery, vehicles, or plant setup. Repayment is in fixed EMIs. Government schemes like 59-minute portal offer faster in-principle approval for eligible MSMEs.',
    },
  },
  {
    id: 'mudra',
    name: 'MUDRA Loan',
    type: 'Government Scheme',
    scheme: 'Pradhan Mantri MUDRA Yojana',
    shortDesc: 'Shishu / Kishore / Tarun categories for micro units.',
    fit: 'Medium',
    color: 'amber',
    details: {
      eligibility: ['Non-farm micro/small enterprise', 'Shishu: up to ₹50,000 | Kishore: ₹50,000–₹5 Lakh | Tarun: ₹5–10 Lakh'],
      interestRate: 'As per bank (typically 10%–16% p.a.)',
      tenure: 'Up to 5–7 years',
      maxAmount: 'Shishu: ₹50,000 | Kishore: ₹5 Lakh | Tarun: ₹10 Lakh',
      documents: ['Identity/address proof', 'Business proof', 'Bank statements', 'Project report for higher amounts'],
      description: 'MUDRA provides loans to non-corporate, non-farm small/micro enterprises. Three categories—Shishu, Kishore, Tarun—define loan size. No collateral for smaller amounts; helps first-time entrepreneurs and tiny businesses.',
    },
  },
  {
    id: 'standup-india',
    name: 'Stand-Up India',
    type: 'Government Scheme',
    scheme: 'Stand-Up India (SC/ST/Women)',
    shortDesc: 'For entrepreneurs from SC, ST or women (greenfield).',
    fit: 'Medium',
    color: 'teal',
    details: {
      eligibility: ['SC/ST or woman entrepreneur', 'Greenfield project (first venture in manufacturing/services/trading)'],
      interestRate: 'As per bank (margin money benefit)',
      tenure: 'Up to 7 years (with moratorium)',
      maxAmount: '₹10 Lakh–₹1 Cr',
      documents: ['Caste/gender proof', 'Project report', 'Identity, address, business proof'],
      description: 'Stand-Up India promotes entrepreneurship among SC, ST and women. Loan is for greenfield projects in manufacturing, services or trading. Composite loan (term + working capital) with relaxed margin and concessional terms.',
    },
  },
  {
    id: 'invoice-financing',
    name: 'Invoice Financing (Factoring)',
    type: 'Trade Finance',
    scheme: 'TReDS / Bank factoring',
    shortDesc: 'Get advance against unpaid invoices from buyers.',
    fit: 'High',
    color: 'cyan',
    details: {
      eligibility: ['B2B sales with credit period', 'Invoices from credible buyers', 'No major disputes'],
      interestRate: 'Typically 12%–20% p.a. (discount rate)',
      tenure: 'Until invoice due date (30–120 days)',
      maxAmount: 'As per invoice value and buyer limit',
      documents: ['Invoice copies', 'Delivery proof', 'Buyer acceptance (if required)', 'MSME registration'],
      description: 'Invoice financing lets you get an advance against unpaid bills. TReDS is an RBI-approved platform for discounting MSME invoices. You receive funds quickly and the buyer pays the financier on due date.',
    },
  },
];

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
};

/** Decode HTML entities (e.g. &#x0bae; or &#2974; for Tamil/Unicode) so Instagram text displays correctly. */
function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

/** Placeholder image for dummy LinkedIn/X cards (neutral gray). */
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect fill="%23334155" width="400" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="14">Profile connected</text></svg>');

/** Dummy display data when backend returns minimal/generic content for LinkedIn or X. No "view from page" copy. */
const PLATFORM_DUMMY: Record<string, { title: string; description: string; image?: string }> = {
  linkedin: {
    title: 'Professional Profile',
    description: 'Profile connected.',
    image: PLACEHOLDER_IMAGE,
  },
  twitter: {
    title: 'X Profile',
    description: 'Profile connected.',
    image: PLACEHOLDER_IMAGE,
  },
  instagram: { title: '', description: '' }, // never use dummy; show decoded fetched data only
};

/** Dummy social metrics per platform (followers, connections, retweets, etc.) for display. */
const PLATFORM_METRICS: Record<
  string,
  { label: string; value: string }[]
> = {
  linkedin: [
    { label: 'Connections', value: '500+' },
    { label: 'Profile views', value: '1.2k' },
  ],
  twitter: [
    { label: 'Followers', value: '2.4k' },
    { label: 'Following', value: '380' },
    { label: 'Retweets', value: '156' },
  ],
  instagram: [
    { label: 'Followers', value: '176' },
    { label: 'Following', value: '73' },
    { label: 'Posts', value: '16' },
  ],
};

/** Returns display title/description/image: decoded and with dummy fallback for LinkedIn/X when minimal. */
function getDisplayData(
  platform: string,
  platformData: Record<string, unknown>
): { title: string; description: string; image: string | null } {
  const rawTitle = (platformData.ogTitle ?? platformData.title) ? String(platformData.ogTitle ?? platformData.title).trim() : '';
  const rawDesc = platformData.ogDescription ? String(platformData.ogDescription).trim() : '';
  const rawImage = platformData.ogImage ? String(platformData.ogImage) : null;

  const isGeneric = (s: string) =>
    !s || /sign\s*up|login|instagram\s*photos|twitter|^instagram$/i.test(s) || s.length < 3;

  const useDummy =
    (platform === 'linkedin' || platform === 'twitter') &&
    (isGeneric(rawTitle) || isGeneric(rawDesc)) &&
    PLATFORM_DUMMY[platform]?.title;

  if (useDummy && PLATFORM_DUMMY[platform]) {
    const d = PLATFORM_DUMMY[platform];
    return {
      title: d.title,
      description: d.description,
      image: d.image ?? rawImage ?? null,
    };
  }

  return {
    title: rawTitle ? decodeHtmlEntities(rawTitle) : '',
    description: rawDesc ? decodeHtmlEntities(rawDesc) : '',
    image: rawImage,
  };
}

/** Only display original fetched data from backend (og/title/description/image). Uses decoded text and dummy for LinkedIn/X. */
function formatFetchedPlatformData(
  platform: string,
  platformData: Record<string, unknown>
): { label: string; value: string; type?: 'text' }[] {
  const display = getDisplayData(platform, platformData);
  const out: { label: string; value: string; type?: 'text' }[] = [];
  if (display.title) out.push({ label: 'Title', value: display.title, type: 'text' });
  if (display.description) out.push({ label: 'Description', value: display.description, type: 'text' });
  return out;
}

const CHAT_API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:5000';

/** Bar chart: current vs projected (shown with what-if answer). Based on dashboard metrics. */
const WHATIF_BAR_METRICS = [
  { label: 'OptilendScore (300–900)', current: 720, projected: 768, max: 900 },
  { label: 'GST compliance %', current: 87, projected: 92, max: 100 },
  { label: 'Cash flow index', current: 75, projected: 85, max: 100 },
  { label: 'Eligibility score %', current: 62, projected: 88, max: 100 },
];

/** Pie chart: factors in scenario (shown with what-if answer). */
const WHATIF_PIE_DATA = [
  { label: 'GST compliance', value: 28, color: '#14b8a6' },
  { label: 'Cash flow', value: 22, color: '#06b6d4' },
  { label: 'UPI / transactions', value: 18, color: '#f59e0b' },
  { label: 'Utility payments', value: 12, color: '#8b5cf6' },
  { label: 'Other factors', value: 20, color: '#64748b' },
];

const MSME_BUSINESS_PROFILE_KEY = 'msme_business_profile';

export default function MSMEDashboardPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [verifiedMSME, setVerifiedMSME] = useState(false);
  const [detailScheme, setDetailScheme] = useState<LoanScheme | null>(null);
  const [socialData, setSocialData] = useState<Record<string, StoredSocialEntry>>({});
  const [whatIfQuestion, setWhatIfQuestion] = useState('');
  const [whatIfAnswer, setWhatIfAnswer] = useState<string | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [consentSummary, setConsentSummary] = useState<ReturnType<typeof parseAAConsent>>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setVerifiedMSME(!!localStorage.getItem(MSME_BUSINESS_PROFILE_KEY));
    } catch {
      setVerifiedMSME(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    if (!localStorage.getItem(MSME_BUSINESS_TOKEN_KEY)) {
      router.replace('/msme/login');
      return;
    }
    if (!hasAAConsent()) {
      router.replace('/msme/account-aggregator-consent');
      return;
    }
    setConsentSummary(parseAAConsent());
  }, [mounted, router]);

  const fetchStoredProfilesFromBackend = async () => {
    const requestUrl = `${SOCIAL_API_URL}/social/profiles`;
    console.log('[MSME Dashboard] GET social/profiles URL:', requestUrl);
    try {
      const res = await fetch(requestUrl);
      const contentType = res.headers.get('content-type') || '';
      console.log('[MSME Dashboard] GET response status:', res.status, 'ok:', res.ok, 'content-type:', contentType);
      const text = await res.text();
      console.log('[MSME Dashboard] GET response body length:', text.length, 'first 400 chars:', text.slice(0, 400));
      let json: { success?: boolean; data?: Record<string, StoredSocialEntry> };
      try {
        json = JSON.parse(text) as { success?: boolean; data?: Record<string, StoredSocialEntry> };
      } catch (parseErr) {
        console.error('[MSME Dashboard] GET response not valid JSON:', parseErr);
        setSocialData({});
        return;
      }
      console.log('[MSME Dashboard] GET parsed success:', json.success, 'data keys:', json.data ? Object.keys(json.data) : 'none');
      if (json.success && json.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
        setSocialData(json.data);
        console.log('[MSME Dashboard] setSocialData called with keys:', Object.keys(json.data));
      } else {
        setSocialData({});
        console.log('[MSME Dashboard] setSocialData empty — success:', json.success, 'hasData:', !!json.data, 'isObject:', json.data && typeof json.data === 'object', 'isArray:', Array.isArray(json.data));
      }
    } catch (err) {
      console.error('[MSME Dashboard] GET error:', err);
      setSocialData({});
    }
  };

  useEffect(() => {
    console.log('[MSME Dashboard] socialData state changed, keys:', Object.keys(socialData), 'length:', Object.keys(socialData).length);
  }, [socialData]);

  useEffect(() => {
    fetchStoredProfilesFromBackend();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onFocus = () => fetchStoredProfilesFromBackend();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const titleBlockRef = useRef<HTMLDivElement>(null);
  const chartBarsRef = useRef<HTMLDivElement>(null);
  const recListRef = useRef<HTMLUListElement>(null);

  const handleWhatIfSubmit = async () => {
    const q = whatIfQuestion.trim();
    if (!q || whatIfLoading) return;
    setWhatIfLoading(true);
    setWhatIfAnswer(null);
    const context = 'Context: MSME dashboard — OptilendScore 720, GST compliance 87%, UPI transactions 1247 (30d), Utility reliability 92%, Cash flow trend +12% MoM (last 7 months).';
    const message = `${context} What-if question: ${q}`;
    try {
      const res = await fetch(`${CHAT_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setWhatIfAnswer(data.reply || 'No response. Try rephrasing your question.');
    } catch {
      setWhatIfAnswer(
        'Based on your dashboard (OptilendScore 720, GST 87%, cash flow +12%): Your profile is strong. ' +
        'For questions about turnover, loans, or compliance, consider speaking with your relationship manager or using the Optilend chatbot for detailed analysis.'
      );
    } finally {
      setWhatIfLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || !mounted) return;
    const ctx = gsap.context(() => {
      if (titleBlockRef.current) {
        const title = titleBlockRef.current.querySelector('h1');
        const bar = titleBlockRef.current.querySelector('.accent-bar');
        if (title) gsap.fromTo(title, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' });
        if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.5, delay: 0.3, transformOrigin: 'left', ease: 'power2.out' });
      }
      const cards = containerRef.current!.querySelectorAll('[data-dashboard-card]');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, delay: 0.15, ease: 'power2.out' }
      );
      if (chartBarsRef.current) {
        const bars = chartBarsRef.current.querySelectorAll('[data-bar]');
        gsap.fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: 0.55, stagger: 0.05, delay: 0.7, ease: 'back.out(1.2)', transformOrigin: 'bottom' });
      }
      if (recListRef.current) {
        const items = recListRef.current.querySelectorAll('li');
        gsap.fromTo(items, { opacity: 0, x: 15 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.07, delay: 0.5, ease: 'power2.out' });
      }
    });
    return () => ctx.revert();
  }, [mounted]);

  return (
    <main className="min-h-screen bg-white">
      <AppHeader title="MSME Portal" verifiedBadge={verifiedMSME} />

      <div ref={containerRef} className="mx-auto max-w-7xl px-6 py-10">
        <div ref={titleBlockRef} className="mb-10">
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">
            Your Credit Intelligence
          </h1>
          <div className="accent-bar h-1 w-20 rounded-full bg-cyan-500" />
        </div>

        {consentSummary && (
          <GlassCard
            variant="strong"
            className="mb-8 border-teal-200/80 bg-gradient-to-r from-teal-50/80 to-white p-5 sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-800">
                  Account Aggregator &amp; GST consent
                </h2>
                <p className="mt-1 text-sm text-slate-700">
                  On file from <strong className="font-medium text-slate-900">{consentSummary.signerName}</strong> —{' '}
                  {new Date(consentSummary.acceptedAt).toLocaleDateString()}. Bank data (via AA) + GST filings
                  authorised for this demo session.
                </p>
              </div>
              <Link
                href="/msme/account-aggregator-consent?review=1"
                className="shrink-0 rounded-xl border-2 border-teal-500/40 bg-white px-4 py-2.5 text-center text-sm font-semibold text-teal-800 shadow-sm transition hover:border-teal-500 hover:bg-teal-50"
              >
                View consent
              </Link>
            </div>
          </GlassCard>
        )}

        {/* Bento: OptilendScore large + GST */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <GlassCard
            data-dashboard-card
            variant="strong"
            glow="cyan"
            className="p-8 lg:col-span-2 flex flex-col items-center justify-center min-h-[300px] hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <OptilendScoreMeter score={720} />
            <p className="mt-4 text-cyan-600 text-sm font-medium">OptilendScore (300–900)</p>
          </GlassCard>
          <GlassCard
            data-dashboard-card
            className="p-6 flex flex-col justify-center hover:border-teal-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/10 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">GST Compliance</h3>
                <p className="text-3xl font-bold text-teal-600 tabular-nums">
                  <AnimatedCounter value={87} suffix="%" />
                </p>
                <p className="mt-1.5 text-xs text-slate-600">Last 12 months</p>
                <p className="mt-2 text-xs text-teal-600">Returns filed on time</p>
              </div>
              <div className="shrink-0 w-14 h-14 relative">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="5" />
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none" stroke="rgb(20,184,166)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(87 / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="flex justify-between text-[10px] text-slate-600 uppercase tracking-wider">
                <span>GSTR-3B</span>
                <span>On time</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-teal-500 w-[87%]" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Stats row */}
        <div className="grid gap-5 sm:grid-cols-3 mb-10">
          <GlassCard
            data-dashboard-card
            className="p-6 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-slate-700 mb-1">UPI Analytics</h3>
                <p className="text-3xl font-bold text-cyan-600 tabular-nums">
                  <AnimatedCounter value={1247} />
                </p>
                <p className="text-slate-600 text-sm mt-0.5">Transactions (30d)</p>
                <p className="mt-2 text-xs text-cyan-600">~42 per day avg</p>
              </div>
              <div className="shrink-0 w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="flex justify-between text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                <span>Volume trend</span>
                <span>+8% vs last month</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden flex gap-0.5">
                {[65, 72, 68, 85, 78, 90, 88].map((w, i) => (
                  <div key={i} className="flex-1 min-w-0 rounded-full bg-cyan-500" style={{ height: '100%' }} title={`Period ${i + 1}`} data-bar />
                ))}
              </div>
            </div>
          </GlassCard>
          <GlassCard
            data-dashboard-card
            className="p-6 hover:border-teal-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-slate-700 mb-1">Utility Reliability</h3>
                <p className="text-3xl font-bold text-teal-600 tabular-nums">
                  <AnimatedCounter value={92} suffix="%" />
                </p>
                <p className="text-slate-600 text-sm mt-0.5">On-time payments</p>
                <p className="mt-2 text-xs text-teal-600">12 of 12 months compliant</p>
              </div>
              <div className="shrink-0 w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="4" />
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none" stroke="rgb(20,184,166)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${(92 / 100) * 2 * Math.PI * 20} ${2 * Math.PI * 20}`}
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="flex justify-between text-[10px] text-slate-600 uppercase tracking-wider">
                <span>Electric · Water · Telecom</span>
                <span>On time</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-teal-500 w-[92%]" />
              </div>
            </div>
          </GlassCard>
          <GlassCard
            data-dashboard-card
            className="p-6 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/10"
          >
            <h3 className="text-sm font-medium text-slate-700 mb-2">Cash Flow Trend</h3>
            <p className="text-3xl font-bold text-amber-600 tabular-nums">
              <span className="text-teal-600">↑</span> 12%
            </p>
            <p className="text-slate-600 text-sm mt-1">MoM growth</p>
            <div className="mt-3 flex items-end gap-0.5 h-8">
              {[40, 55, 48, 65, 58, 72, 75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 rounded-t bg-amber-500 max-h-full"
                  style={{ height: `${h}%` }}
                  data-bar
                />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-600">Last 7 periods</p>
          </GlassCard>
        </div>

        {/* Linked social profiles (from login) */}
        {Object.keys(socialData).length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span className="h-0.5 w-8 rounded bg-teal-500" />
              Linked social profiles
            </h2>
            <GlassCard data-dashboard-card className="p-6 hover:border-teal-500/50 transition-all duration-300 hover:shadow-lg">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(socialData).map(([platform, entry]) => {
                  const pd = entry.platformData || {};
                  const display = getDisplayData(platform, pd);
                  const showImage = display.image;
                  const stats = PLATFORM_METRICS[platform] || [];
                  return (
                    <div
                      key={platform}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col transition-all duration-300 hover:border-teal-500/40 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-800">
                          {PLATFORM_LABELS[platform] || platform}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-xs bg-teal-500/20 text-teal-600">
                          {entry.status}
                        </span>
                      </div>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-600 hover:text-cyan-700 truncate block mb-3"
                      >
                        {entry.url}
                      </a>
                      {showImage && (
                        <div className="mb-3 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                          <img src={showImage} alt="" className="w-full h-28 object-cover" />
                        </div>
                      )}
                      {/* Title & description (Instagram: full; LinkedIn/X: short or dummy) */}
                      {(display.title || display.description) && (
                        <div className="mb-3 space-y-1 min-w-0">
                          {display.title && (
                            <p className="text-sm font-medium text-slate-800 truncate" title={display.title}>
                              {display.title}
                            </p>
                          )}
                          {display.description && (
                            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                              {display.description}
                            </p>
                          )}
                        </div>
                      )}
                      {/* Dummy metrics: followers, connections, retweets, etc. */}
                      {stats.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 mb-3 py-2 border-y border-slate-200">
                          {stats.map((s) => (
                            <div key={s.label} className="flex justify-between items-baseline gap-2 text-xs">
                              <span className="text-slate-600 shrink-0">{s.label}</span>
                              <span className="text-slate-800 font-medium tabular-nums truncate">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {entry.socialScore != null && (
                        <p className="mt-auto pt-2 text-xs text-slate-600">
                          Social score: {(Number(entry.socialScore) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Cash flow block */}
        <div className="mb-10">
          <h2 className="font-display text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <span className="h-0.5 w-8 rounded bg-cyan-500" />
            Cash Flow
          </h2>
          <GlassCard data-dashboard-card className="p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg">
            <p className="text-sm text-slate-600 mb-4">Monthly cash flow index (higher is better)</p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5">
              {/* Y-axis scale */}
              <div className="flex gap-3 sm:gap-4">
                <div className="flex flex-col justify-between text-[10px] text-slate-600 font-medium h-52 shrink-0">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>25</span>
                  <span>0</span>
                </div>
                {/* Chart area with grid and bars */}
                <div className="flex-1 min-w-0 relative h-52">
                  {/* Horizontal grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-px w-full bg-slate-200" />
                    ))}
                  </div>
                  <div ref={chartBarsRef} className="absolute inset-0 flex items-end justify-around gap-1 sm:gap-2 px-0">
                    {[40, 65, 45, 80, 60, 90, 75].map((value, i) => {
                      const isPeak = value === 90 && i === 5;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0 max-w-[56px]">
                          <span className="text-[10px] text-slate-600 font-medium mb-1 tabular-nums">{value}</span>
                          <div
                            data-bar
                            className={`w-full rounded-t-md transition-all duration-300 hover:opacity-100 ${
                              isPeak
                                ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20'
                                : 'bg-gradient-to-t from-cyan-600 to-cyan-400 opacity-90'
                            }`}
                            style={{ height: `${value}%`, minHeight: '6px' }}
                            title={`M${i + 1}: ${value}`}
                          />
                          <span className={`text-[10px] font-medium mt-1.5 ${i === 5 ? 'text-cyan-600' : 'text-slate-600'}`}>
                            M{i + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span>Last 7 months</span>
              <span className="text-cyan-600 font-medium">Peak: M6 (90)</span>
            </div>
          </GlassCard>
        </div>

        {/* What-if section – user enters question, text answer displayed */}
        <div className="mb-10">
          <h2 className="font-display text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <span className="h-0.5 w-8 rounded bg-amber-500" />
            What-if scenarios
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Ask a what-if question based on your dashboard (OptilendScore, cash flow, GST, etc.). The answer is generated from your data above.
          </p>
          <GlassCard data-dashboard-card className="p-6 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg">
            <label htmlFor="whatif-input" className="block text-sm font-semibold text-slate-800 mb-2">
              Your question
            </label>
            <textarea
              id="whatif-input"
              value={whatIfQuestion}
              onChange={(e) => setWhatIfQuestion(e.target.value)}
              placeholder="e.g. What if my GST turnover crosses ₹1 Cr this year? What if I take a CGTMSE-backed loan of ₹30 lakh?"
              rows={3}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              disabled={whatIfLoading}
            />
            <button
              type="button"
              onClick={handleWhatIfSubmit}
              disabled={!whatIfQuestion.trim() || whatIfLoading}
              className="mt-3 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {whatIfLoading ? 'Analyzing…' : 'Get insight'}
            </button>

            {whatIfAnswer !== null && (
              <>
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">Answer (based on your dashboard)</p>
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{whatIfAnswer}</p>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {/* Bar chart: Current vs Projected */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">Current vs Projected</p>
                    <div className="space-y-3">
                      {WHATIF_BAR_METRICS.map((m) => {
                        const currentPct = (m.current / m.max) * 100;
                        const projectedPct = (m.projected / m.max) * 100;
                        return (
                          <div key={m.label} className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span className="truncate pr-2">{m.label}</span>
                              <span className="shrink-0 tabular-nums">{m.current} → {m.projected}</span>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="flex-1 h-6 rounded-md bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full rounded-md bg-slate-400 transition-all duration-500"
                                  style={{ width: `${currentPct}%`, minWidth: currentPct > 0 ? '4px' : '0' }}
                                />
                              </div>
                              <div className="flex-1 h-6 rounded-md bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full rounded-md bg-amber-500 transition-all duration-500"
                                  style={{ width: `${projectedPct}%`, minWidth: projectedPct > 0 ? '4px' : '0' }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500">
                              <span>Current</span>
                              <span>Projected</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pie chart: Factors in this scenario */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col items-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">Factors in this scenario</p>
                    <div
                      className="w-40 h-40 rounded-full shrink-0"
                      style={{
                        background: `conic-gradient(
                          ${WHATIF_PIE_DATA[0].color} 0% ${WHATIF_PIE_DATA[0].value}%,
                          ${WHATIF_PIE_DATA[1].color} ${WHATIF_PIE_DATA[0].value}% ${WHATIF_PIE_DATA[0].value + WHATIF_PIE_DATA[1].value}%,
                          ${WHATIF_PIE_DATA[2].color} ${WHATIF_PIE_DATA[0].value + WHATIF_PIE_DATA[1].value}% ${WHATIF_PIE_DATA[0].value + WHATIF_PIE_DATA[1].value + WHATIF_PIE_DATA[2].value}%,
                          ${WHATIF_PIE_DATA[3].color} ${WHATIF_PIE_DATA[0].value + WHATIF_PIE_DATA[1].value + WHATIF_PIE_DATA[2].value}% ${100 - WHATIF_PIE_DATA[4].value}%,
                          ${WHATIF_PIE_DATA[4].color} ${100 - WHATIF_PIE_DATA[4].value}% 100%
                        )`,
                      }}
                    />
                    <ul className="mt-3 w-full space-y-1.5">
                      {WHATIF_PIE_DATA.map((d) => (
                        <li key={d.label} className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          <span className="text-slate-700">{d.label}</span>
                          <span className="ml-auto font-medium text-slate-800 tabular-nums">{d.value}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </GlassCard>
        </div>

        {/* Loans & Schemes */}
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <span className="h-0.5 w-8 rounded bg-teal-500" />
            Loans & Schemes for You
          </h2>
          <GlassCard data-dashboard-card className="p-6 hover:border-teal-500/50 transition-all duration-300 hover:shadow-lg">
            <ul ref={recListRef} className="space-y-3">
              {LOAN_SCHEMES.map((scheme) => (
                <li
                  key={scheme.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:border-teal-500/50 hover:bg-slate-100 transition-all duration-300"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{scheme.name}</p>
                    <p className="text-sm text-slate-600">{scheme.type} · {scheme.scheme}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{scheme.shortDesc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        scheme.color === 'teal'
                          ? 'bg-teal-500/20 text-teal-600'
                          : scheme.color === 'cyan'
                          ? 'bg-cyan-500/20 text-cyan-600'
                          : 'bg-amber-500/20 text-amber-600'
                      }`}
                    >
                      {scheme.fit} fit
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailScheme(scheme)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-cyan-600 hover:bg-cyan-500/20 border border-cyan-500/50 transition-all duration-300 hover:scale-105"
                    >
                      View details
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 border border-teal-500 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      Apply
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      {/* Detail modal */}
      {detailScheme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailScheme(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="scheme-detail-title"
        >
          <div
            className="glass-strong w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white/95 backdrop-blur">
              <h3 id="scheme-detail-title" className="font-display text-lg font-semibold text-slate-900">
                {detailScheme.name}
              </h3>
              <button
                type="button"
                onClick={() => setDetailScheme(null)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-700">{detailScheme.details.description}</p>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Eligibility</h4>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {detailScheme.details.eligibility.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Interest rate</h4>
                  <p className="text-sm text-slate-800">{detailScheme.details.interestRate}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tenure</h4>
                  <p className="text-sm text-slate-800">{detailScheme.details.tenure}</p>
                </div>
                <div className="sm:col-span-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Max amount</h4>
                  <p className="text-sm text-slate-800">{detailScheme.details.maxAmount}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Documents</h4>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {detailScheme.details.documents.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <Chatbot />
    </main>
  );
}
