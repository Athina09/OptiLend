'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from '@/lib/gsap';
import { GlassCard } from '@/components/ui/GlassCard';
import { AppHeader } from '@/components/AppHeader';

const MOCK_MSMES = [
  { id: 'MSME-001', name: 'Shree Krishna Traders', score: 745, risk: 'Low', industry: 'Retail', location: 'Mumbai', turnover: '50L-1Cr' },
  { id: 'MSME-002', name: 'Precision Gears & Tools Pvt Ltd', score: 612, risk: 'Medium', industry: 'Manufacturing', location: 'Pune', turnover: '1Cr-5Cr' },
  { id: 'MSME-003', name: 'NexGen Software Solutions Pvt Ltd', score: 820, risk: 'Low', industry: 'IT', location: 'Bangalore', turnover: '5Cr-10Cr' },
  { id: 'MSME-004', name: 'Green Valley Agro Pvt Ltd', score: 558, risk: 'Medium', industry: 'Agriculture', location: 'Nagpur', turnover: '25L-50L' },
  { id: 'MSME-005', name: 'Spice Route Foods Pvt Ltd', score: 690, risk: 'Low', industry: 'F&B', location: 'Delhi', turnover: '1Cr-5Cr' },
];

export default function BankDashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [riskFilter, setRiskFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [turnoverFilter, setTurnoverFilter] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || !mounted) return;
    const ctx = gsap.context(() => {
      const title = containerRef.current!.querySelector('h1');
      if (title) gsap.fromTo(title, { opacity: 0, y: -15 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
      const filterBar = containerRef.current!.querySelector('[data-filter-bar]');
      if (filterBar) gsap.fromTo(filterBar, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, delay: 0.1, ease: 'power2.out' });
      const cards = containerRef.current!.querySelectorAll('[data-bank-card]');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, delay: 0.2, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, [mounted]);

  const filtered = MOCK_MSMES.filter((m) => {
    if (riskFilter && m.risk !== riskFilter) return false;
    if (industryFilter && m.industry !== industryFilter) return false;
    if (turnoverFilter && m.turnover !== turnoverFilter) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-white">
      <AppHeader title="Bank / Lender Portal" />

      <div ref={containerRef} className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">
          MSME Portfolio
        </h1>
        <p className="text-cyan-600 text-sm mb-6">Filter and explore MSMEs by risk, industry, and turnover</p>

        <GlassCard data-filter-bar className="mb-6 p-4 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-600">Filters</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
            >
              <option value="">Risk band</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
            >
              <option value="">Industry</option>
              <option value="Retail">Retail</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="IT">IT</option>
              <option value="Agriculture">Agriculture</option>
              <option value="F&B">F&B</option>
            </select>
            <select
              value={turnoverFilter}
              onChange={(e) => setTurnoverFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
            >
              <option value="">Turnover range</option>
              <option value="25L-50L">25L–50L</option>
              <option value="50L-1Cr">50L–1Cr</option>
              <option value="1Cr-5Cr">1Cr–5Cr</option>
              <option value="5Cr-10Cr">5Cr–10Cr</option>
            </select>
          </div>
        </GlassCard>

        <div className="space-y-4">
          {filtered.map((msme) => (
            <GlassCard
              key={msme.id}
              data-bank-card
              className="overflow-hidden hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <Link
                href={`/bank/msme/${msme.id}`}
                className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 hover:bg-slate-50 transition-all duration-300 block group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-600 font-bold transition-transform duration-300 group-hover:scale-110">
                    {msme.score}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{msme.name}</p>
                    <p className="text-sm text-slate-600">{msme.id}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <span>
                    <span className="text-slate-600">OptilendScore </span>
                    <span className="font-medium text-slate-800">{msme.score}</span>
                  </span>
                  <span>
                    <span className="text-slate-600">Risk </span>
                    <span
                      className={
                        msme.risk === 'Low'
                          ? 'text-teal-600'
                          : msme.risk === 'Medium'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }
                    >
                      {msme.risk}
                    </span>
                  </span>
                  <span className="text-slate-600">{msme.industry}</span>
                  <span className="text-slate-600">{msme.location}</span>
                  <span className="text-slate-600">{msme.turnover}</span>
                </div>
                <span className="text-cyan-600 text-sm font-medium group-hover:translate-x-1 transition-transform duration-300">View details →</span>
              </Link>
            </GlassCard>
          ))}
        </div>
      </div>
    </main>
  );
}
