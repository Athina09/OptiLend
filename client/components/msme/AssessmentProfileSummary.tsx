'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import {
  ASSESSMENT_PROFILE_META,
  type AssessmentProfileId,
} from '@/lib/msme-assessment-bridge';
import type { ScoreExplanation } from '@/lib/scoring-api';

type Props = {
  explanation: ScoreExplanation | null;
  liveScore: number | null;
  fallbackProfileId: AssessmentProfileId | null;
};

const PILLAR_LABELS: { key: keyof NonNullable<ScoreExplanation['pillars']>; short: string }[] = [
  { key: 'bankStability', short: 'Bank' },
  { key: 'gstCompliance', short: 'GST' },
  { key: 'upiBehavior', short: 'UPI' },
  { key: 'businessProfile', short: 'Profile' },
  { key: 'growthSignal', short: 'Growth' },
];

export function AssessmentProfileSummary({ explanation, liveScore, fallbackProfileId }: Props) {
  if (explanation?.mode !== 'assessment') return null;

  const segment =
    explanation.scoring_segment ??
    explanation.inputEcho?.scoring_segment ??
    fallbackProfileId;
  if (!segment) return null;

  const meta = ASSESSMENT_PROFILE_META[segment];
  const tier = explanation.creditTier;
  const echo = explanation.inputEcho;
  const p = explanation.pillars;

  return (
    <GlassCard
      data-dashboard-card
      variant="strong"
      className="mb-8 overflow-hidden border-teal-200/70 p-0 shadow-md"
    >
      <div className="border-b border-teal-200/60 bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-4 sm:px-8 sm:py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Assessment result</p>
        <h2 className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">{meta.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50">{meta.tagline}</p>
        <p className="mt-2 text-xs font-medium text-teal-100/90">{meta.expectedBand}</p>
      </div>

      <div className="space-y-0 bg-gradient-to-b from-teal-50/40 to-white">
        <div className="grid gap-px bg-teal-100/50 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">OptilendScore</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-teal-700 sm:text-4xl">
              {liveScore != null ? liveScore : '—'}
            </p>
            {tier ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-800">{tier.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{tier.summary}</p>
              </div>
            ) : null}
          </div>
          <div className="bg-white p-4 sm:p-5 lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Business inputs (model)</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Monthly revenue</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                  {echo?.monthly_revenue != null
                    ? `₹${Math.round(echo.monthly_revenue).toLocaleString('en-IN')}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Employees</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{echo?.employees ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Registered</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{echo?.registration_year ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Location</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{echo?.location || '—'}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="border-t border-teal-100 px-5 py-5 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Scoring components</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200/80 bg-white p-4">
              <dt className="text-xs text-slate-500">Pillar composite (pre-peer)</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {explanation.assessmentRuleScore ?? explanation.ruleScore}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white p-4">
              <dt className="text-xs text-slate-500">Peer data leg</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{explanation.dataScore}</dd>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white p-4">
              <dt className="text-xs text-slate-500">Nearest synthetic MSME</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {explanation.nearestBusinessId != null ? `ID ${explanation.nearestBusinessId}` : '—'}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-white p-4">
              <dt className="text-xs text-slate-500">Segment</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-slate-800">{segment}</dd>
            </div>
          </dl>
        </div>

        {p && (
          <div className="border-t border-teal-100 px-5 pb-6 sm:px-8">
            <p className="pt-5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Pillar strength (0–100%)
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {PILLAR_LABELS.map(({ key, short }) => {
                const v = p[key];
                const pct = Number.isFinite(v) ? Math.round(v * 100) : 0;
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-slate-200/80 bg-white p-3 text-center shadow-sm"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{short}</div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-teal-800">{pct}%</div>
                    <div className="mx-auto mt-2 h-2 max-w-[5rem] overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
