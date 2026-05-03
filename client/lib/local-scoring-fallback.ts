/**
 * Deterministic OptilendScore when the scoring-layer service is down.
 * Mirrors scoring-layer/utils (featureEngineering, scoring, assessmentScoring) without the corpus.
 */

import type { AssessmentPayload, AssessmentSegmentId } from './assessment-presets';

const SCORE_MIN = 300;
const SCORE_MAX = 900;
const ASSESSMENT_PEER_BLEND = 0.12;

/** From scoring-layer/data/dataset.json average precomputed_score (peer leg surrogate). */
const FALLBACK_DATA_SCORE = Math.round(646.88);
const FALLBACK_DATASET_SIZE = 52;

/** Revenue stats from the same corpus (for ruleScore normalization). */
const CORPUS_STATS = {
  minRevenue: 52410.5,
  maxRevenue: 449945.67,
  averageRevenue: 259825.58,
};

export type LegacyScoringBody = {
  monthly_sales: number[];
  monthly_expenses: number[];
  digital_txn_ratio: number;
  gst_filed: boolean;
  loan_defaults: 0 | 1;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function scaleToScore(t01: number): number {
  return SCORE_MIN + clamp01(t01) * (SCORE_MAX - SCORE_MIN);
}

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}

function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return 0.5;
  const t = (value - min) / (max - min);
  return Math.min(1, Math.max(0, t));
}

function generateFeatures(data: LegacyScoringBody) {
  const sales = data.monthly_sales.map(Number);
  const expenses = data.monthly_expenses.map(Number);
  const avgRevenue = mean(sales);
  const avgExpenses = mean(expenses);
  const profitMargin =
    avgRevenue > 0 ? (avgRevenue - avgExpenses) / avgRevenue : avgExpenses > 0 ? -1 : 0;
  const revenueStability = stdDev(sales);
  const expenseRatio = avgRevenue > 0 ? avgExpenses / avgRevenue : avgExpenses > 0 ? 2 : 0;
  const gstCompliance = data.gst_filed === true ? 1 : 0;
  const defaultRisk = Number(data.loan_defaults) === 1 ? 1 : 0;
  const digitalRaw = clamp01(
    typeof data.digital_txn_ratio === 'number' && !Number.isNaN(data.digital_txn_ratio)
      ? data.digital_txn_ratio
      : 0
  );
  return {
    averageRevenue: avgRevenue,
    averageExpenses: avgExpenses,
    profitMargin,
    revenueStability,
    expenseRatio,
    gstCompliance,
    defaultRisk,
    digitalTxnRatio: digitalRaw,
    digitalScore: digitalRaw * 100,
  };
}

function computeRuleScore(
  features: ReturnType<typeof generateFeatures>,
  stats: typeof CORPUS_STATS
): number {
  const { minRevenue, maxRevenue } = stats;
  const revNorm = normalize(features.averageRevenue, minRevenue, maxRevenue);
  const marginClamped = Math.min(1, Math.max(-0.5, features.profitMargin));
  const marginNorm = (marginClamped + 0.5) / 1.5;
  const expRatio = Math.min(2, Math.max(0, features.expenseRatio));
  const expenseHealth = 1 - normalize(expRatio, 0, 1.2);
  const cv = features.averageRevenue > 0 ? features.revenueStability / features.averageRevenue : 1;
  const stabilityScore = 1 - normalize(cv, 0, 0.5);
  let health01 =
    revNorm * 0.22 +
    marginNorm * 0.28 +
    expenseHealth * 0.22 +
    stabilityScore * 0.13 +
    features.gstCompliance * 0.1 +
    features.digitalTxnRatio * 0.05;
  health01 -= features.defaultRisk * 0.35;
  health01 = Math.min(1, Math.max(0, health01));
  return Math.round(scaleToScore(health01));
}

function creditTierFromScore(score: number) {
  if (!Number.isFinite(score)) return null;
  if (score >= 760) {
    return {
      tier: 'strong',
      label: 'Strong creditworthiness',
      summary: 'Strong formal discipline, stable bank signals, and GST alignment.',
    };
  }
  if (score >= 610) {
    return {
      tier: 'moderate',
      label: 'Medium / elevated watch',
      summary: 'Mixed formality or GST frictions — monitor cash and compliance.',
    };
  }
  return {
    tier: 'elevated',
    label: 'Higher uncertainty',
    summary: 'Early-stage, burn, or weak formal footprint — underwriting needs extra checks.',
  };
}

const WEIGHTS = {
  bankStability: 0.35,
  gstCompliance: 0.25,
  upiBehavior: 0.15,
  businessProfile: 0.15,
  growthSignal: 0.1,
};

function pillarBankStability(a: AssessmentPayload): number {
  const bd = a.bank_data;
  const rev = Math.max(1, Number(a.monthly_revenue) || 0);
  const inflow = Number(bd.monthly_inflow);
  const outflow = Number(bd.monthly_outflow);
  const bal = Number(bd.avg_balance);
  const inOk = Number.isFinite(inflow) && inflow > 0;
  const outOk = Number.isFinite(outflow) && outflow >= 0;
  let flowScore = 0.5;
  if (inOk && outOk) {
    const netRatio = (inflow - outflow) / inflow;
    flowScore = clamp01(0.42 + netRatio * 2.8);
  }
  const balRev = Number.isFinite(bal) ? bal / rev : 0;
  const bufferScore = clamp01(0.35 + balRev * 1.15);
  const cash = Number.isFinite(bd.cash_deposit_ratio) ? clamp01(bd.cash_deposit_ratio) : 0.25;
  const formalScore = clamp01(1 - (cash - 0.06) / 0.42);
  const emiDefault = bd.emi_default === true;
  const emiScore = emiDefault ? 0.28 : 1;
  return clamp01(flowScore * 0.38 + bufferScore * 0.32 + formalScore * 0.2 + emiScore * 0.1);
}

function pillarGstCompliance(a: AssessmentPayload): number {
  const g = a.gst_filings;
  if (!g.gst_registered) return 0.22;
  const onTime =
    g.on_time_filing_rate != null && Number.isFinite(Number(g.on_time_filing_rate))
      ? clamp01(Number(g.on_time_filing_rate))
      : 0.55;
  let filingBoost = 0;
  const freq = String(g.filing_frequency || '').toLowerCase();
  if (freq === 'monthly') filingBoost = 0.08;
  else if (freq === 'quarterly') filingBoost = 0.02;
  const rev = Math.max(1, Number(a.monthly_revenue) || 0);
  let mismatchPenalty = 0;
  if (g.mismatch_flag === true) mismatchPenalty = 0.14;
  let turnoverGapPenalty = 0;
  if (g.reported_turnover != null && Number.isFinite(Number(g.reported_turnover))) {
    const rt = Number(g.reported_turnover);
    const gap = Math.abs(rt - rev) / rev;
    turnoverGapPenalty = clamp01((gap - 0.02) / 0.35) * 0.12;
  }
  return clamp01(onTime * 0.82 + filingBoost + 0.1 - mismatchPenalty - turnoverGapPenalty);
}

function pillarUpiBehavior(a: AssessmentPayload): number {
  const u = a.upi_transactions;
  const cnt = Number(u.monthly_txn_count);
  const fail = Number(u.failed_txn_rate);
  const volScore = Number.isFinite(cnt)
    ? clamp01((Math.log1p(cnt) - Math.log1p(40)) / (Math.log1p(400) - Math.log1p(40)))
    : 0.45;
  const failScore = Number.isFinite(fail) ? clamp01(1 - fail / 0.12) : 0.7;
  const avgVal = Number(u.avg_txn_value);
  const ticketScore = Number.isFinite(avgVal) ? clamp01(0.35 + (avgVal - 300) / 3500) : 0.5;
  return clamp01(volScore * 0.45 + failScore * 0.4 + ticketScore * 0.15);
}

function pillarBusinessProfile(a: AssessmentPayload): number {
  const rev = Math.max(1, Number(a.monthly_revenue) || 0);
  const emp = Number(a.employees);
  const year = Number(a.registration_year);
  const nowY = new Date().getFullYear();
  const tenure = Number.isFinite(year) ? Math.max(0, nowY - year) : 3;
  const scaleScore = clamp01(
    (Math.log1p(rev) - Math.log1p(80000)) / (Math.log1p(8000000) - Math.log1p(80000))
  );
  const empScore = Number.isFinite(emp) ? clamp01((emp - 2) / 36) : 0.35;
  const tenureScore = clamp01(tenure / 14);
  return clamp01(scaleScore * 0.45 + empScore * 0.3 + tenureScore * 0.25);
}

function pillarGrowthSignal(a: AssessmentPayload): number {
  const b = a.behavioral_score;
  const c = Number(b.consistency);
  const g = Number(b.growth_trend);
  const cOk = Number.isFinite(c) ? clamp01(c) : 0.55;
  const gOk = Number.isFinite(g) ? clamp01(g) : 0.55;
  return clamp01(cOk * 0.55 + gOk * 0.45);
}

function computeAssessmentPillars(assessment: AssessmentPayload) {
  const pillars = {
    bankStability: pillarBankStability(assessment),
    gstCompliance: pillarGstCompliance(assessment),
    upiBehavior: pillarUpiBehavior(assessment),
    businessProfile: pillarBusinessProfile(assessment),
    growthSignal: pillarGrowthSignal(assessment),
  };
  let health01 =
    pillars.bankStability * WEIGHTS.bankStability +
    pillars.gstCompliance * WEIGHTS.gstCompliance +
    pillars.upiBehavior * WEIGHTS.upiBehavior +
    pillars.businessProfile * WEIGHTS.businessProfile +
    pillars.growthSignal * WEIGHTS.growthSignal;
  const g = assessment.gst_filings;
  const bd = assessment.bank_data;
  if (
    g.gst_registered === true &&
    String(g.filing_frequency || '').toLowerCase() === 'monthly' &&
    Number(g.on_time_filing_rate) >= 0.9 &&
    g.mismatch_flag !== true &&
    bd.emi_default !== true
  ) {
    health01 = clamp01(health01 + 0.02);
  }
  const segMult: Record<AssessmentSegmentId, number> = {
    auto_parts: 1.038,
    tailoring: 0.968,
    tech_startup: 0.915,
  };
  const seg = assessment.scoring_segment;
  const mult =
    seg === 'auto_parts' || seg === 'tailoring' || seg === 'tech_startup' ? segMult[seg] : 1;
  health01 = clamp01(health01 * mult);

  return {
    pillars,
    health01: clamp01(health01),
    assessmentRuleScore: Math.round(scaleToScore(health01)),
    weights: { ...WEIGHTS },
  };
}

function assessmentToLegacyPayload(assessment: AssessmentPayload): LegacyScoringBody {
  const rev = Math.max(0, Number(assessment.monthly_revenue) || 0);
  const months = 6;
  const sales = Array.from({ length: months }, () => Math.round(rev));
  const bd = assessment.bank_data;
  const out = Number.isFinite(Number(bd.monthly_outflow)) ? Number(bd.monthly_outflow) : rev * 0.92;
  const expenses = Array.from({ length: months }, () => Math.round(out));
  const cash = Number.isFinite(Number(bd.cash_deposit_ratio))
    ? clamp01(Number(bd.cash_deposit_ratio))
    : 0.25;
  const digitalTxnRatio = clamp01(0.92 - cash * 1.85);
  const gst = assessment.gst_filings;
  const gstFiled = gst.gst_registered === true;
  const loanDefaults = bd.emi_default === true ? 1 : 0;
  return {
    monthly_sales: sales,
    monthly_expenses: expenses,
    digital_txn_ratio: digitalTxnRatio,
    gst_filed: gstFiled,
    loan_defaults: loanDefaults as 0 | 1,
  };
}

function isAssessmentPayload(body: unknown): body is AssessmentPayload {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) return false;
  const o = body as Record<string, unknown>;
  if (Array.isArray(o.monthly_sales)) return false;
  if (!Number.isFinite(Number(o.monthly_revenue)) || Number(o.monthly_revenue) < 0) return false;
  if (o.bank_data == null || typeof o.bank_data !== 'object' || Array.isArray(o.bank_data))
    return false;
  return true;
}

function isLegacyPayload(body: unknown): body is LegacyScoringBody {
  if (body == null || typeof body !== 'object') return false;
  const o = body as Record<string, unknown>;
  if (!Array.isArray(o.monthly_sales) || o.monthly_sales.length === 0) return false;
  if (!Array.isArray(o.monthly_expenses) || o.monthly_expenses.length === 0) return false;
  if (typeof o.digital_txn_ratio !== 'number' || o.digital_txn_ratio < 0 || o.digital_txn_ratio > 1)
    return false;
  if (typeof o.gst_filed !== 'boolean') return false;
  const ld = Number(o.loan_defaults);
  if (ld !== 0 && ld !== 1) return false;
  return true;
}

function buildFeaturesBlock(f: ReturnType<typeof generateFeatures>) {
  return {
    averageRevenue: f.averageRevenue,
    averageExpenses: f.averageExpenses,
    profitMargin: f.profitMargin,
    revenueStability: f.revenueStability,
    expenseRatio: f.expenseRatio,
    gstCompliance: f.gstCompliance,
    defaultRisk: f.defaultRisk,
    digitalTxnRatio: f.digitalTxnRatio,
    digitalScore: f.digitalScore,
  };
}

/**
 * Same JSON shape as POST /score from scoring-layer, computed entirely in the browser.
 */
export function tryOfflineScoreResponse(body: unknown): { score: number; explanation: Record<string, unknown> } | null {
  if (isAssessmentPayload(body)) {
    const pillarPack = computeAssessmentPillars(body);
    const legacyInput = assessmentToLegacyPayload(body);
    const features = generateFeatures(legacyInput);
    const corpusRuleScore = computeRuleScore(features, CORPUS_STATS);
    const dataScore = FALLBACK_DATA_SCORE;
    const wPillar = 1 - ASSESSMENT_PEER_BLEND;
    const wPeer = ASSESSMENT_PEER_BLEND;
    const blended = pillarPack.assessmentRuleScore * wPillar + dataScore * wPeer;
    const score = Math.round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, blended)));

    return {
      score,
      explanation: {
        offlineEstimate: true,
        mode: 'assessment',
        businessType: body.business_type ?? null,
        scoring_segment: body.scoring_segment ?? null,
        creditTier: creditTierFromScore(score),
        pillars: pillarPack.pillars,
        pillarWeights: pillarPack.weights,
        health01: pillarPack.health01,
        assessmentRuleScore: pillarPack.assessmentRuleScore,
        corpusRuleScore,
        dataScore,
        nearestBusinessId: null,
        nearestDistance: null,
        nearestPeerAvgRevenue: null,
        nearestPeerDigitalRatio: null,
        nearestPeerPrecomputedScore: FALLBACK_DATA_SCORE,
        datasetSize: FALLBACK_DATASET_SIZE,
        features: buildFeaturesBlock(features),
        blend: {
          pillarWeight: wPillar,
          peerWeight: wPeer,
          formula: `offline: round(clamp(${wPillar}×${pillarPack.assessmentRuleScore} + ${wPeer}×${dataScore})) → ${score}`,
          note:
            'Client-side estimate using the same pillar formulas as the scoring layer; peer leg uses a fixed corpus-average score because the live engine is offline.',
        },
        inputEcho: {
          monthly_revenue: Number(body.monthly_revenue),
          location: body.location ?? null,
          registration_year: body.registration_year ?? null,
          employees: body.employees ?? null,
          scoring_segment: body.scoring_segment ?? null,
        },
      },
    };
  }

  if (isLegacyPayload(body)) {
    const features = generateFeatures(body);
    const ruleScore = computeRuleScore(features, CORPUS_STATS);
    const dataScore = FALLBACK_DATA_SCORE;
    const score = Math.round(
      Math.min(SCORE_MAX, Math.max(SCORE_MIN, ruleScore * 0.6 + dataScore * 0.4))
    );
    const ld = Number(body.loan_defaults);

    return {
      score,
      explanation: {
        offlineEstimate: true,
        mode: 'legacy',
        ruleScore,
        dataScore,
        nearestBusinessId: null,
        nearestDistance: null,
        nearestPeerAvgRevenue: null,
        nearestPeerDigitalRatio: null,
        nearestPeerPrecomputedScore: null,
        datasetSize: FALLBACK_DATASET_SIZE,
        features: buildFeaturesBlock(features),
        blend: {
          ruleWeight: 0.6,
          dataWeight: 0.4,
          formula: `offline: round(0.6×${ruleScore} + 0.4×${dataScore}) → ${score}`,
          note:
            'Client-side estimate using the same rule formulas as the scoring layer; data leg uses a fixed corpus-average score because the live engine is offline.',
        },
        inputEcho: {
          gst_filed: body.gst_filed,
          loan_defaults: ld,
          digital_txn_ratio: body.digital_txn_ratio,
          monthly_points: body.monthly_sales.length,
        },
      },
    };
  }

  return null;
}
