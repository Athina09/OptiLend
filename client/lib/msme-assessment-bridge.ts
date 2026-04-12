import {
  ASSESSMENT_PRESET_AUTO_PARTS,
  ASSESSMENT_PRESET_SAAS,
  ASSESSMENT_PRESET_TAILORING,
  type AssessmentPayload,
  type AssessmentSegmentId,
} from './assessment-presets';

/** Written by /msme/assessment on submit; read on dashboard to drive scoring. */
export const MSME_VERIFICATION_ASSESSMENT_KEY = 'msme_verification_assessment_v1';

export type StoredVerificationAssessment = {
  answers: Record<string, string>;
  submittedAt: number;
};

export type AssessmentProfileId = AssessmentSegmentId;

/** Judge-friendly copy per segment (shown on dashboard). */
export const ASSESSMENT_PROFILE_META: Record<
  AssessmentProfileId,
  { title: string; tagline: string; expectedBand: string }
> = {
  auto_parts: {
    title: 'Auto parts manufacturing',
    tagline: 'High GST discipline · stable bank flow · lower cash-in-hand ratio',
    expectedBand: 'Typical OptilendScore band ~770–830',
  },
  tailoring: {
    title: 'Tailoring & garment production',
    tagline: 'GST mismatch risk · higher cash deposits · moderate UPI reliability',
    expectedBand: 'Typical band ~590–670',
  },
  tech_startup: {
    title: 'Tech startup / SaaS',
    tagline: 'Negative operating cash · often no GST · growth signal partially offsets risk',
    expectedBand: 'Typical band ~530–620',
  },
};

/**
 * Classify Q1 job line → segment (order: startup first so “auto software startup” maps to tech).
 */
export function classifyAssessmentJobLine(jobLine: string): AssessmentProfileId | null {
  const line = jobLine.toLowerCase();
  if (
    /tech\s*startup|saas|\bstartup\b|software|b2b\s*saas|early[\s-]*stage|product\s*studio|\bapi\b|\bmvp\b/.test(
      line
    )
  ) {
    return 'tech_startup';
  }
  if (/tailor|tailoring|garment|textile|stitch|apparel|boutique/.test(line)) {
    return 'tailoring';
  }
  if (
    /\bautoparts?\b|auto\s*parts|auto|automotive|vehicle|parts?\s*manufactur|manufactur\w*\s+of\s+auto|oem|component|\bspare\s*parts?\b/.test(
      line
    )
  ) {
    return 'auto_parts';
  }
  return null;
}

export function classifyAssessmentProfile(answers: Record<string, string>): AssessmentProfileId | null {
  return classifyAssessmentJobLine((answers.q1 || '').trim());
}

function presetForSegment(id: AssessmentProfileId): AssessmentPayload {
  switch (id) {
    case 'auto_parts':
      return ASSESSMENT_PRESET_AUTO_PARTS;
    case 'tailoring':
      return ASSESSMENT_PRESET_TAILORING;
    case 'tech_startup':
      return ASSESSMENT_PRESET_SAAS;
    default:
      return ASSESSMENT_PRESET_SAAS;
  }
}

/**
 * Maps free-text verification assessment → rich scoring payload when keywords match.
 * Returns null → dashboard falls back to legacy slider demo payload.
 */
export function assessmentAnswersToPayload(answers: Record<string, string>): AssessmentPayload | null {
  const job = (answers.q1 || '').trim();
  const segment = classifyAssessmentJobLine(job);
  if (!segment) return null;

  const base = presetForSegment(segment);
  const out: AssessmentPayload = {
    ...base,
    business_type: job || base.business_type,
    scoring_segment: segment,
  };

  const year = parseInt((answers.q2 || '').replace(/\D/g, '').slice(0, 4), 10);
  const now = new Date().getFullYear();
  if (Number.isFinite(year) && year >= 1980 && year <= now) {
    out.registration_year = year;
  }

  const empMatch = (answers.q4 || '').match(/\d+/);
  if (empMatch) {
    const emp = parseInt(empMatch[0], 10);
    if (emp >= 1 && emp <= 5000) out.employees = emp;
  }

  const loc = (answers.q5 || '').trim();
  if (loc) out.location = loc;

  return out;
}
