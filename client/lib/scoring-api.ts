import type { AssessmentPayload, AssessmentSegmentId } from './assessment-presets';

export type ScoreFeatures = {
  averageRevenue: number;
  averageExpenses: number;
  profitMargin: number;
  revenueStability: number;
  expenseRatio: number;
  gstCompliance: number;
  defaultRisk: number;
  digitalTxnRatio: number;
  digitalScore: number;
};

export type ScoreBlendInfo = {
  ruleWeight?: number;
  dataWeight?: number;
  pillarWeight?: number;
  peerWeight?: number;
  formula: string;
  note: string;
};

export type ScoreInputEcho = {
  gst_filed?: boolean;
  loan_defaults?: number;
  digital_txn_ratio?: number;
  monthly_points?: number;
  monthly_revenue?: number;
  location?: string | null;
  registration_year?: number | null;
  employees?: number | null;
  scoring_segment?: AssessmentSegmentId | null;
};

export type CreditTierInfo = {
  tier: string;
  label: string;
  summary: string;
};

export type AssessmentPillars = {
  bankStability: number;
  gstCompliance: number;
  upiBehavior: number;
  businessProfile: number;
  growthSignal: number;
};

export type ScoreExplanation = {
  mode?: 'legacy' | 'assessment';
  businessType?: string | null;
  scoring_segment?: AssessmentSegmentId | null;
  creditTier?: CreditTierInfo | null;
  /** Legacy rule leg or assessment pillar composite (300–900) — UI uses this as the “rules” number */
  ruleScore: number;
  dataScore: number;
  assessmentRuleScore?: number;
  corpusRuleScore?: number;
  pillars?: AssessmentPillars;
  pillarWeights?: Record<string, number>;
  health01?: number;
  nearestBusinessId: number | null;
  datasetSize: number;
  nearestDistance: number | null;
  nearestPeerAvgRevenue: number | null;
  nearestPeerDigitalRatio: number | null;
  nearestPeerPrecomputedScore: number | null;
  features?: ScoreFeatures;
  blend?: ScoreBlendInfo;
  inputEcho?: ScoreInputEcho;
};

export type ScoringPayload = {
  monthly_sales: number[];
  monthly_expenses: number[];
  digital_txn_ratio: number;
  gst_filed: boolean;
  loan_defaults: 0 | 1;
};

/** Demo payload aligned with dashboard copy; scoring layer blends rule + dataset similarity. */
export const DEFAULT_SCORING_DEMO_PAYLOAD: ScoringPayload = {
  monthly_sales: [180000, 195000, 210000, 198000, 220000, 205000],
  monthly_expenses: [120000, 125000, 130000, 128000, 135000, 132000],
  digital_txn_ratio: 0.72,
  gst_filed: true,
  loan_defaults: 0,
};

function parseExplanation(expl: Record<string, unknown>): ScoreExplanation | null {
  const nd = expl.nearestDistance;
  const nar = expl.nearestPeerAvgRevenue;
  const ndig = expl.nearestPeerDigitalRatio;

  const mode = expl.mode === 'assessment' ? 'assessment' : expl.mode === 'legacy' ? 'legacy' : undefined;
  const ars = Number(expl.assessmentRuleScore);
  const legacyRule = Number(expl.ruleScore);
  const ruleScore =
    mode === 'assessment' && Number.isFinite(ars)
      ? ars
      : Number.isFinite(legacyRule)
        ? legacyRule
        : NaN;
  if (!Number.isFinite(ruleScore) || !Number.isFinite(Number(expl.dataScore))) {
    return null;
  }

  const rawFeatures = expl.features;
  let features: ScoreFeatures | undefined;
  if (rawFeatures && typeof rawFeatures === 'object' && !Array.isArray(rawFeatures)) {
    const fx = rawFeatures as Record<string, unknown>;
    features = {
      averageRevenue: Number(fx.averageRevenue),
      averageExpenses: Number(fx.averageExpenses),
      profitMargin: Number(fx.profitMargin),
      revenueStability: Number(fx.revenueStability),
      expenseRatio: Number(fx.expenseRatio),
      gstCompliance: Number(fx.gstCompliance),
      defaultRisk: Number(fx.defaultRisk),
      digitalTxnRatio: Number(fx.digitalTxnRatio),
      digitalScore: Number(fx.digitalScore),
    };
  }

  const rawBlend = expl.blend;
  let blend: ScoreBlendInfo | undefined;
  if (rawBlend && typeof rawBlend === 'object' && !Array.isArray(rawBlend)) {
    const b = rawBlend as Record<string, unknown>;
    blend = {
      ruleWeight: b.ruleWeight != null ? Number(b.ruleWeight) : undefined,
      dataWeight: b.dataWeight != null ? Number(b.dataWeight) : undefined,
      pillarWeight: b.pillarWeight != null ? Number(b.pillarWeight) : undefined,
      peerWeight: b.peerWeight != null ? Number(b.peerWeight) : undefined,
      formula: String(b.formula ?? ''),
      note: String(b.note ?? ''),
    };
  }

  const rawEcho = expl.inputEcho;
  let inputEcho: ScoreInputEcho | undefined;
  if (rawEcho && typeof rawEcho === 'object' && !Array.isArray(rawEcho)) {
    const ie = rawEcho as Record<string, unknown>;
    inputEcho = {
      gst_filed: typeof ie.gst_filed === 'boolean' ? ie.gst_filed : undefined,
      loan_defaults: ie.loan_defaults != null ? Number(ie.loan_defaults) : undefined,
      digital_txn_ratio: ie.digital_txn_ratio != null ? Number(ie.digital_txn_ratio) : undefined,
      monthly_points: ie.monthly_points != null ? Number(ie.monthly_points) : undefined,
      monthly_revenue: ie.monthly_revenue != null ? Number(ie.monthly_revenue) : undefined,
      location: ie.location != null ? String(ie.location) : undefined,
      registration_year: ie.registration_year != null ? Number(ie.registration_year) : undefined,
      employees: ie.employees != null ? Number(ie.employees) : undefined,
      scoring_segment:
        ie.scoring_segment === 'auto_parts' ||
        ie.scoring_segment === 'tailoring' ||
        ie.scoring_segment === 'tech_startup'
          ? (ie.scoring_segment as AssessmentSegmentId)
          : undefined,
    };
  }

  let pillars: AssessmentPillars | undefined;
  const rp = expl.pillars;
  if (rp && typeof rp === 'object' && !Array.isArray(rp)) {
    const p = rp as Record<string, unknown>;
    pillars = {
      bankStability: Number(p.bankStability),
      gstCompliance: Number(p.gstCompliance),
      upiBehavior: Number(p.upiBehavior),
      businessProfile: Number(p.businessProfile),
      growthSignal: Number(p.growthSignal),
    };
  }

  let pillarWeights: Record<string, number> | undefined;
  const rw = expl.pillarWeights;
  if (rw && typeof rw === 'object' && !Array.isArray(rw)) {
    pillarWeights = { ...rw } as Record<string, number>;
  }

  const corpusRule = Number(expl.corpusRuleScore);
  const health = Number(expl.health01);

  let creditTier: CreditTierInfo | null = null;
  const rawTier = expl.creditTier;
  if (rawTier && typeof rawTier === 'object' && !Array.isArray(rawTier)) {
    const t = rawTier as Record<string, unknown>;
    creditTier = {
      tier: String(t.tier ?? ''),
      label: String(t.label ?? ''),
      summary: String(t.summary ?? ''),
    };
  }

  const segRaw = expl.scoring_segment;
  let scoring_segment: AssessmentSegmentId | null = null;
  if (segRaw === 'auto_parts' || segRaw === 'tailoring' || segRaw === 'tech_startup') {
    scoring_segment = segRaw;
  }

  return {
    mode,
    businessType: expl.businessType != null ? String(expl.businessType) : null,
    scoring_segment,
    creditTier,
    ruleScore,
    dataScore: Number(expl.dataScore),
    assessmentRuleScore: Number.isFinite(ars) ? ars : undefined,
    corpusRuleScore: Number.isFinite(corpusRule) ? corpusRule : undefined,
    pillars,
    pillarWeights,
    health01: Number.isFinite(health) ? health : undefined,
    nearestBusinessId:
      expl.nearestBusinessId === null || expl.nearestBusinessId === undefined
        ? null
        : Number(expl.nearestBusinessId),
    datasetSize: Number(expl.datasetSize),
    nearestDistance:
      nd === null || nd === undefined || Number.isNaN(Number(nd)) ? null : Number(nd),
    nearestPeerAvgRevenue:
      nar === null || nar === undefined || Number.isNaN(Number(nar)) ? null : Number(nar),
    nearestPeerDigitalRatio:
      ndig === null || ndig === undefined || Number.isNaN(Number(ndig)) ? null : Number(ndig),
    nearestPeerPrecomputedScore:
      expl.nearestPeerPrecomputedScore === null ||
      expl.nearestPeerPrecomputedScore === undefined
        ? null
        : Number(expl.nearestPeerPrecomputedScore),
    features,
    blend,
    inputEcho,
  };
}

function scoringRequestUrls(): string[] {
  const pub =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SCORING_LAYER_URL
      ? process.env.NEXT_PUBLIC_SCORING_LAYER_URL.trim().replace(/\/$/, '')
      : '';
  const urls: string[] = [];
  if (pub) urls.push(`${pub}/score`);
  urls.push('/api/score');
  return urls;
}

function normalizeScore(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function postScoreJson(
  body: unknown
): Promise<
  | { ok: true; score: number; explanation: ScoreExplanation }
  | { ok: false; error: string }
> {
  let lastError = 'Scoring service unreachable';

  for (const url of scoringRequestUrls()) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let data: Record<string, unknown>;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        lastError = `Invalid JSON from ${url === '/api/score' ? 'Next /api/score' : 'scoring layer'}`;
        continue;
      }

      if (!res.ok) {
        lastError =
          typeof data.error === 'string'
            ? data.error
            : `Scoring request failed (${res.status})`;
        continue;
      }

      const score = normalizeScore(data.score);
      if (score === null || !data.explanation || typeof data.explanation !== 'object') {
        lastError = 'Invalid scoring response shape';
        continue;
      }

      const explanation = parseExplanation(data.explanation as Record<string, unknown>);
      if (!explanation) {
        lastError = 'Invalid scoring explanation shape';
        continue;
      }

      return {
        ok: true,
        score,
        explanation,
      };
    } catch (e) {
      lastError =
        e instanceof Error
          ? `${e.message}${url.startsWith('http') ? '' : ' (is the scoring layer running on port 5055?)'}`
          : String(e);
    }
  }

  return { ok: false, error: lastError };
}

export async function postScore(
  payload: ScoringPayload
): Promise<
  | { ok: true; score: number; explanation: ScoreExplanation }
  | { ok: false; error: string }
> {
  return postScoreJson(payload);
}

/** Rich assessment (bank + GST + UPI + profile + behavior) — same /api/score route, different body shape. */
export async function postAssessmentScore(
  payload: AssessmentPayload
): Promise<
  | { ok: true; score: number; explanation: ScoreExplanation }
  | { ok: false; error: string }
> {
  return postScoreJson(payload);
}
