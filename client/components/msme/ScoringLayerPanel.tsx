'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ASSESSMENT_PRESETS, type AssessmentPayload } from '@/lib/assessment-presets';
import {
  DEFAULT_SCORING_DEMO_PAYLOAD,
  postAssessmentScore,
  postScore,
  type ScoreExplanation,
  type ScoringPayload,
} from '@/lib/scoring-api';

function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function SectionShell({
  step,
  title,
  description,
  children,
}: {
  /** Omit for non-numbered blocks (e.g. status). */
  step?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        {step ? (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-xs font-bold text-white shadow-sm"
            aria-hidden
          >
            {step}
          </span>
        ) : (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-500" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description ? <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export type ScoreUpdateMeta = { previousScore: number };

type Props = {
  explanation: ScoreExplanation | null;
  /** Seeds comparison state on first load (must match dashboard dial). */
  liveScore: number | null;
  onScored: (score: number, explanation: ScoreExplanation, meta?: ScoreUpdateMeta) => void;
  initialError: string | null;
  onClearInitialError: () => void;
};

export function ScoringLayerPanel({
  explanation,
  liveScore,
  onScored,
  initialError,
  onClearInitialError,
}: Props) {
  const [salesScale, setSalesScale] = useState(1);
  const [digital, setDigital] = useState(DEFAULT_SCORING_DEMO_PAYLOAD.digital_txn_ratio);
  const [gstFiled, setGstFiled] = useState(DEFAULT_SCORING_DEMO_PAYLOAD.gst_filed);
  const [loanDefault, setLoanDefault] = useState(DEFAULT_SCORING_DEMO_PAYLOAD.loan_defaults === 1);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);

  const prevRef = useRef<{ id: number | null; score: number } | null>(null);

  useEffect(() => {
    if (liveScore === null) return;
    if (!explanation?.nearestBusinessId) return;
    if (prevRef.current !== null) return;
    prevRef.current = { id: explanation.nearestBusinessId, score: liveScore };
  }, [explanation, liveScore]);

  const scaledSales = DEFAULT_SCORING_DEMO_PAYLOAD.monthly_sales.map((x) =>
    Math.round(x * salesScale)
  );
  const scaledExpenses = DEFAULT_SCORING_DEMO_PAYLOAD.monthly_expenses.map((x) =>
    Math.round(x * salesScale)
  );
  const avgMonthlySales = Math.round(mean(scaledSales));

  const buildPayload = (): ScoringPayload => ({
    monthly_sales: scaledSales,
    monthly_expenses: scaledExpenses,
    digital_txn_ratio: Math.min(1, Math.max(0, digital)),
    gst_filed: gstFiled,
    loan_defaults: loanDefault ? 1 : 0,
  });

  const clearInsightOnInputChange = () => setInsight(null);

  const applyScoreResult = (
    r: { ok: true; score: number; explanation: ScoreExplanation },
    presetMessage: string | null
  ) => {
    const before = prevRef.current;
    if (presetMessage != null) {
      setInsight(presetMessage);
    } else if (before) {
      const idChanged = r.explanation.nearestBusinessId !== before.id;
      const scoreChanged = Math.round(r.score) !== Math.round(before.score);
      const isAsm = r.explanation.mode === 'assessment';
      if (isAsm) {
        if (scoreChanged) {
          setInsight(
            `Assessment pillars (bank · GST · UPI · profile · growth) moved OptilendScore ${before.score} → ${r.score}. A small peer nudge from dataset.json is applied on top.`
          );
        } else {
          setInsight(null);
        }
      } else if (idChanged && scoreChanged) {
        setInsight(
          `Nearest synthetic MSME moved ${before.id} → ${r.explanation.nearestBusinessId}, and OptilendScore moved ${before.score} → ${r.score}. The blend is 60% rule-based health and 40% the nearest row’s data score — so a new peer changes both the “data” leg and the final number.`
        );
      } else if (idChanged) {
        setInsight(
          `Nearest peer changed ${before.id} → ${r.explanation.nearestBusinessId} (similarity is by your avg monthly sales + digital %). Final score ${before.score} → ${r.score}.`
        );
      } else if (scoreChanged) {
        setInsight(
          `Same nearest peer (ID ${r.explanation.nearestBusinessId}), but score ${before.score} → ${r.score} because rule inputs (GST, default flag, margins) still move the 60% rule leg.`
        );
      } else {
        setInsight(
          'Same nearest peer and same rounded score — push revenue scale or digital % further to hop to another synthetic MSME in the dataset.'
        );
      }
    } else {
      setInsight(null);
    }
    prevRef.current = {
      id: r.explanation.nearestBusinessId,
      score: r.score,
    };
    onScored(
      r.score,
      r.explanation,
      before != null ? { previousScore: before.score } : undefined
    );
  };

  const handleRun = async () => {
    onClearInitialError();
    setRunError(null);
    setRunning(true);
    const r = await postScore(buildPayload());
    setRunning(false);
    if (r.ok) {
      applyScoreResult(r, null);
    } else {
      setRunError(r.error);
    }
  };

  const handleAssessmentPreset = async (payload: AssessmentPayload, label: string) => {
    onClearInitialError();
    setRunError(null);
    setInsight(null);
    setRunning(true);
    const r = await postAssessmentScore(payload);
    setRunning(false);
    if (r.ok) {
      applyScoreResult(
        r,
        `Loaded “${label}”: full bank + GST + UPI + behavioral assessment. Compare pillar bars below — manufacturing vs tailoring vs SaaS should land in different bands.`
      );
    } else {
      setRunError(r.error);
    }
  };

  const displayError = runError || initialError;

  return (
    <GlassCard variant="strong" className="overflow-hidden border-cyan-200/60 p-0 sm:p-0">
      <header className="border-b border-slate-200/80 bg-gradient-to-r from-cyan-50/50 to-white px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">Live engine</p>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">Scoring layer</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Run a <strong className="font-medium text-slate-800">slider-based demo</strong> (60% rules / 40% nearest
              peer in <code className="rounded bg-white px-1.5 py-0.5 text-xs shadow-sm">dataset.json</code>) or load
              an <strong className="font-medium text-slate-800">industry assessment</strong> (five pillars: bank 35%,
              GST 25%, UPI 15%, profile 15%, growth 10%).
            </p>
          </div>
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="shrink-0 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-700 disabled:opacity-60"
          >
            {running ? 'Scoring…' : 'Run scoring'}
          </button>
        </div>
      </header>

      <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
        <SectionShell
          step="1"
          title="Industry assessment presets"
          description="One-click full profiles for demos (bank + GST + UPI + behaviour). Updates the dashboard score and explanation."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ASSESSMENT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={running}
                onClick={() => handleAssessmentPreset(p.payload, p.label)}
                className="flex min-h-[5.5rem] flex-col justify-center rounded-xl border-2 border-teal-200/80 bg-white px-4 py-3 text-left shadow-sm transition hover:border-teal-400 hover:bg-teal-50/50 disabled:opacity-50"
              >
                <span className="text-sm font-semibold text-slate-900">{p.label}</span>
                <span className="mt-1 text-xs leading-snug text-slate-600">{p.hint}</span>
              </button>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          step="2"
          title="Manual demo inputs"
          description="Adjust and click Run scoring. Nearest peer is chosen from average monthly sales + digital share."
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm sm:col-span-2">
              <span className="font-medium text-slate-800">Revenue scale</span>
              <input
                type="range"
                min={25}
                max={250}
                value={Math.round(salesScale * 100)}
                onChange={(e) => {
                  clearInsightOnInputChange();
                  setSalesScale(Number(e.target.value) / 100);
                }}
                className="w-full accent-cyan-600"
              />
              <span className="text-xs text-slate-500">
                <span className="tabular-nums font-medium text-slate-700">{salesScale.toFixed(2)}×</span>
                {' · '}
                Avg monthly sales{' '}
                <span className="tabular-nums font-medium text-cyan-800">₹{avgMonthlySales.toLocaleString('en-IN')}</span>
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-800">Digital txn ratio</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(digital * 100)}
                onChange={(e) => {
                  clearInsightOnInputChange();
                  setDigital(Number(e.target.value) / 100);
                }}
                className="w-full accent-cyan-600"
              />
              <span className="text-xs tabular-nums text-slate-500">{(digital * 100).toFixed(0)}%</span>
            </label>
            <div className="flex flex-col justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Flags</span>
              <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={gstFiled}
                  onChange={(e) => {
                    clearInsightOnInputChange();
                    setGstFiled(e.target.checked);
                  }}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                GST filed
              </label>
              <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={loanDefault}
                  onChange={(e) => {
                    clearInsightOnInputChange();
                    setLoanDefault(e.target.checked);
                  }}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                Loan default
              </label>
            </div>
          </div>
        </SectionShell>

        {(insight || displayError) && (
          <SectionShell title="Status" description="Messages from the last scoring action.">
            <div className="space-y-3">
              {insight ? (
                <p className="rounded-lg border border-cyan-200 bg-cyan-50/90 px-4 py-3 text-sm text-slate-800">
                  {insight}
                </p>
              ) : null}
              {displayError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {displayError}
                </p>
              ) : null}
            </div>
          </SectionShell>
        )}

        {explanation && (
          <SectionShell
            step="3"
            title="Results & explanation"
            description="Everything below reflects the last successful scoring response."
          >
            <div className="space-y-6">
              {explanation.blend && (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blend formula</p>
                  <p className="mt-2 font-mono text-xs break-all text-slate-800">{explanation.blend.formula}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{explanation.blend.note}</p>
                </div>
              )}

              {explanation.pillars && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pillar signals (0–100%)
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {(
                      [
                        ['Bank stability', 'bankStability'],
                        ['GST compliance', 'gstCompliance'],
                        ['UPI behaviour', 'upiBehavior'],
                        ['Business profile', 'businessProfile'],
                        ['Growth signal', 'growthSignal'],
                      ] as const
                    ).map(([label, key]) => {
                      const v = explanation.pillars![key];
                      const pct = Number.isFinite(v) ? Math.round(v * 100) : 0;
                      return (
                        <div key={key} className="rounded-lg border border-slate-100 bg-white p-3">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span className="font-medium text-slate-700">{label}</span>
                            <span className="tabular-nums font-semibold text-slate-900">{pct}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-teal-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {explanation.features && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {explanation.mode === 'assessment'
                      ? 'Mapped series (peer similarity)'
                      : 'Engineered features from your inputs'}
                  </p>
                  <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-slate-500">Avg monthly revenue</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                        ₹{Math.round(explanation.features.averageRevenue).toLocaleString('en-IN')}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-slate-500">Avg monthly expenses</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                        ₹{Math.round(explanation.features.averageExpenses).toLocaleString('en-IN')}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-slate-500">Profit margin</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                        {(explanation.features.profitMargin * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-slate-500">Expense / revenue</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                        {explanation.features.expenseRatio.toFixed(3)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-slate-500">Revenue stability (σ)</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                        {Math.round(explanation.features.revenueStability).toLocaleString('en-IN')}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-slate-500">GST (rule)</dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {explanation.features.gstCompliance === 1 ? 'Filed' : 'Not filed'}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-slate-500">Default flag</dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {explanation.features.defaultRisk === 1 ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-slate-500">Digital share</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                        {(explanation.features.digitalTxnRatio * 100).toFixed(0)}%
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Peer match &amp; dataset
                </p>
                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <dt className="text-xs text-slate-500">
                      {explanation.mode === 'assessment'
                        ? `Pillar composite (${explanation.blend?.pillarWeight != null ? Math.round(explanation.blend.pillarWeight * 100) : 88}%)`
                        : `Rule score (${explanation.blend?.ruleWeight != null ? Math.round(explanation.blend.ruleWeight * 100) : 60}%)`}
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums text-slate-900">{explanation.ruleScore}</dd>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <dt className="text-xs text-slate-500">
                      {explanation.mode === 'assessment'
                        ? `Peer data (${explanation.blend?.peerWeight != null ? Math.round(explanation.blend.peerWeight * 100) : 12}%)`
                        : `Peer score (${explanation.blend?.dataWeight != null ? Math.round(explanation.blend.dataWeight * 100) : 40}%)`}
                    </dt>
                    <dd className="mt-1 font-semibold tabular-nums text-slate-900">{explanation.dataScore}</dd>
                  </div>
                  {explanation.mode === 'assessment' && explanation.corpusRuleScore != null && (
                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                      <dt className="text-xs text-slate-500">Corpus rule (mapped)</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-800">
                        {explanation.corpusRuleScore}
                      </dd>
                    </div>
                  )}
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <dt className="text-xs text-slate-500">Nearest business ID</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                      {explanation.nearestBusinessId ?? '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <dt className="text-xs text-slate-500">Similarity distance</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                      {explanation.nearestDistance != null ? explanation.nearestDistance : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <dt className="text-xs text-slate-500">Peer avg monthly sales</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                      {explanation.nearestPeerAvgRevenue != null
                        ? `₹${Math.round(explanation.nearestPeerAvgRevenue).toLocaleString('en-IN')}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <dt className="text-xs text-slate-500">Peer digital ratio</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                      {explanation.nearestPeerDigitalRatio != null
                        ? `${(explanation.nearestPeerDigitalRatio * 100).toFixed(1)}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3">
                    <dt className="text-xs text-slate-500">Dataset size</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-slate-900">{explanation.datasetSize}</dd>
                  </div>
                  {explanation.nearestPeerPrecomputedScore != null && (
                    <div className="rounded-lg border border-slate-100 bg-white p-3 sm:col-span-2 lg:col-span-3">
                      <dt className="text-xs text-slate-500">Peer precomputed score</dt>
                      <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                        {explanation.nearestPeerPrecomputedScore}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </SectionShell>
        )}
      </div>
    </GlassCard>
  );
}
