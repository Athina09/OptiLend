'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { gsap } from '@/lib/gsap';
import { GlassCard } from '@/components/ui/GlassCard';
import { OptilendScoreMeter } from '@/components/dashboard/OptilendScoreMeter';

const MOCK_MSME: Record<string, { name: string; score: number; risk: string; industry: string; location: string; turnover: string }> = {
  'MSME-001': { name: 'Shree Krishna Traders', score: 745, risk: 'Low', industry: 'Retail', location: 'Mumbai', turnover: '50L-1Cr' },
  'MSME-002': { name: 'Precision Gears & Tools Pvt Ltd', score: 612, risk: 'Medium', industry: 'Manufacturing', location: 'Pune', turnover: '1Cr-5Cr' },
  'MSME-003': { name: 'NexGen Software Solutions Pvt Ltd', score: 820, risk: 'Low', industry: 'IT', location: 'Bangalore', turnover: '5Cr-10Cr' },
  'MSME-004': { name: 'Green Valley Agro Pvt Ltd', score: 558, risk: 'Medium', industry: 'Agriculture', location: 'Nagpur', turnover: '25L-50L' },
  'MSME-005': { name: 'Spice Route Foods Pvt Ltd', score: 690, risk: 'Low', industry: 'F&B', location: 'Delhi', turnover: '1Cr-5Cr' },
};

const SHAP_FACTORS = [
  { name: 'GST compliance', impact: 0.28, direction: 'positive' },
  { name: 'Cash flow consistency', impact: 0.22, direction: 'positive' },
  { name: 'UPI transaction volume', impact: 0.18, direction: 'positive' },
  { name: 'Utility payment history', impact: 0.12, direction: 'positive' },
  { name: 'Industry risk', impact: -0.08, direction: 'negative' },
];

/** Dummy social media profiles per MSME (varied by id for realism). */
function getDummySocialForMsme(msmeId: string) {
  const seed = msmeId.replace(/\D/g, '') || '1';
  const n = Math.min(parseInt(seed, 10) || 1, 5);
  const linkedInConnections = 380 + n * 120;
  const linkedInViewsNum = 800 + n * 200;
  const linkedInViewsStr = linkedInViewsNum >= 1000
    ? `${(linkedInViewsNum / 1000).toFixed(1).replace(/\.0$/, '')}k`
    : String(linkedInViewsNum);
  return [
    {
      platform: 'LinkedIn',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/msme-profile',
      title: 'Professional Profile',
      connections: linkedInConnections,
      profileViews: linkedInViewsStr,
    },
    {
      platform: 'X (Twitter)',
      label: 'X (Twitter)',
      url: 'https://x.com/msme_handle',
      title: 'Business account',
      followers: 1200 + n * 400,
      following: 200 + n * 50,
      retweets: 80 + n * 20,
    },
    {
      platform: 'Instagram',
      label: 'Instagram',
      url: 'https://www.instagram.com/msme_business',
      title: 'Business profile',
      followers: 450 + n * 100,
      following: 120 + n * 30,
      posts: 24 + n * 4,
    },
  ];
}

export default function BankMSMEDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const msme = MOCK_MSME[id] || MOCK_MSME['MSME-001'];
  const containerRef = useRef<HTMLDivElement>(null);
  const socialProfiles = getDummySocialForMsme(id);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    const ctx = gsap.context(() => {
      const cards = containerRef.current!.querySelectorAll('[data-detail-card]');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' }
      );
      const trendBars = containerRef.current!.querySelectorAll('[data-trend-bar]');
      gsap.fromTo(trendBars, { scaleY: 0 }, { scaleY: 1, duration: 0.5, stagger: 0.04, delay: 0.4, ease: 'power2.out', transformOrigin: 'bottom' });
      const shapBars = containerRef.current!.querySelectorAll('[data-shap-bar]');
      gsap.fromTo(shapBars, { scaleX: 0 }, { scaleX: 1, duration: 0.5, stagger: 0.06, delay: 0.3, ease: 'power2.out', transformOrigin: 'left' });
    });
    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <header className="glass-strong sticky top-0 z-30 border-b border-slate-200 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="font-display text-xl font-bold text-cyan-600 hover:text-cyan-700 transition-colors duration-300">
            Optilend
          </Link>
          <Link
            href="/bank/dashboard"
            className="text-sm text-slate-600 hover:text-cyan-600 transition-colors duration-300"
          >
            ← Back to portfolio
          </Link>
        </div>
      </header>

      <div ref={containerRef} className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{msme.name}</h1>
            <p className="text-slate-600 text-sm">{id}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">Industry</span>
            <span className="text-slate-800">{msme.industry}</span>
            <span className="text-slate-600">Location</span>
            <span className="text-slate-800">{msme.location}</span>
            <span className="text-slate-600">Turnover</span>
            <span className="text-slate-800">{msme.turnover}</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlassCard data-detail-card variant="strong" glow="teal" className="p-6 flex flex-col items-center">
            <OptilendScoreMeter score={msme.score} />
            <p className="mt-4 text-slate-600 text-sm">OptilendScore</p>
            <span
              className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${
                msme.risk === 'Low'
                  ? 'bg-teal-500/20 text-teal-600'
                  : msme.risk === 'Medium'
                  ? 'bg-amber-500/20 text-amber-600'
                  : 'bg-red-500/20 text-red-600'
              }`}
            >
              {msme.risk} risk
            </span>
          </GlassCard>

          <GlassCard data-detail-card className="p-6 lg:col-span-2">
            <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">
              SHAP Explanation (Score Drivers)
            </h3>
            <div className="space-y-3">
              {SHAP_FACTORS.map((f, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-40 text-sm text-slate-600 shrink-0">{f.name}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      data-shap-bar
                      className={`h-full rounded-full ${
                        f.direction === 'positive' ? 'bg-teal-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.abs(f.impact) * 100}%` }}
                    />
                  </div>
                  <span
                    className={`w-12 text-right text-sm font-medium ${
                      f.direction === 'positive' ? 'text-teal-600' : 'text-amber-600'
                    }`}
                  >
                    {(f.impact * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <GlassCard data-detail-card className="p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">
              Cash Flow Trends
            </h3>
            <div className="h-48 flex items-end gap-2">
              {[35, 50, 45, 65, 55, 70, 68, 75, 72, 80].map((h, i) => (
                <div
                  key={i}
                  data-trend-bar
                  className="flex-1 rounded-t bg-cyan-500 opacity-90 min-w-0"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600">Last 10 months (indexed)</p>
          </GlassCard>

          <GlassCard data-detail-card className="p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">
              Credit Behavior Insights
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-slate-700">
                <span className="text-teal-600">✓</span> GST filings on time (last 12 months)
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <span className="text-teal-600">✓</span> No bounced UPI transactions
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <span className="text-teal-600">✓</span> Utility payments within 30 days
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <span className="text-cyan-600">•</span> Bank statement coverage: 6+ months
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <span className="text-cyan-600">•</span> Revenue trend: Stable MoM
              </li>
            </ul>
          </GlassCard>
        </div>

        <div className="mt-6">
          <GlassCard data-detail-card className="p-6">
            <h3 className="font-display text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="h-0.5 w-8 rounded bg-teal-500" />
              Social media
            </h3>
            <p className="text-sm text-slate-600 mb-4">Linked profiles and engagement (dummy data for review)</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {socialProfiles.map((profile) => (
                <div
                  key={profile.platform}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-300 hover:border-teal-500/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-800">{profile.label}</span>
                    <span className="rounded-full px-2 py-0.5 text-xs bg-teal-500/20 text-teal-600">
                      Connected
                    </span>
                  </div>
                  <a
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-600 hover:text-cyan-700 truncate block mb-3"
                  >
                    {profile.url}
                  </a>
                  {profile.title && (
                    <p className="text-sm text-slate-700 mb-3">{profile.title}</p>
                  )}
                  <div className="space-y-1.5 text-xs">
                    {'connections' in profile && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Connections</span>
                        <span className="text-slate-800 font-medium tabular-nums">{profile.connections}+</span>
                      </div>
                    )}
                    {'profileViews' in profile && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Profile views</span>
                        <span className="text-slate-800 font-medium tabular-nums">{profile.profileViews}</span>
                      </div>
                    )}
                    {'followers' in profile && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Followers</span>
                          <span className="text-slate-800 font-medium tabular-nums">{profile.followers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Following</span>
                          <span className="text-slate-800 font-medium tabular-nums">{profile.following}</span>
                        </div>
                        {'retweets' in profile && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Retweets</span>
                            <span className="text-slate-800 font-medium tabular-nums">{profile.retweets}</span>
                          </div>
                        )}
                        {'posts' in profile && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Posts</span>
                            <span className="text-slate-800 font-medium tabular-nums">{profile.posts}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
