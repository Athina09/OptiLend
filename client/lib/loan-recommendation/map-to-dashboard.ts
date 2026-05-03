import { SEGMENT_LOAN_DATASETS } from './datasets';
import type { DashboardLoanScheme, SegmentId, SegmentLoanRecommendation } from './types';

function fitColor(fit: SegmentLoanRecommendation['fit']): DashboardLoanScheme['color'] {
  if (fit === 'High') return 'teal';
  if (fit === 'Medium') return 'cyan';
  return 'amber';
}

function slugId(loanType: string, index: number): string {
  const base = loanType
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'loan'}-${index}`;
}

function formatMaxAmount(n: number | undefined): string {
  if (n == null) return 'As per lender / scheme limits';
  if (n >= 1_00_00_000) return `Up to ₹${(n / 1_00_00_000).toFixed(2)} Cr (indicative)`;
  if (n >= 1_00_000) return `Up to ₹${(n / 1_00_000).toFixed(2)} Lakh (indicative)`;
  return `Up to ₹${n.toLocaleString('en-IN')} (indicative)`;
}

const GENERIC_DOCS = [
  'Udyam / business registration',
  'Identity & address proof',
  'Bank statements (6–12 months)',
  'GST returns (if applicable)',
];

/**
 * Maps segment dataset → dashboard loan cards (same UI as generic LOAN_SCHEMES).
 * @param liveScore optional OptilendScore for modal copy; reference score still in dataset meta.
 */
export function loanSchemesForSegment(segment: SegmentId, liveScore: number | null): DashboardLoanScheme[] {
  const ds = SEGMENT_LOAN_DATASETS[segment];
  const scoreLine =
    liveScore != null
      ? `Your current OptilendScore: ${liveScore}. Reference profile score for this demo dataset: ${ds.reference_credit_score}.`
      : `Reference OptilendScore for this profile: ${ds.reference_credit_score}.`;

  return ds.loan_recommendations.map((rec, i) => ({
    id: slugId(rec.loan_type, i),
    name: rec.loan_type,
    type: ds.business_type,
    scheme: 'Industry-matched demo',
    shortDesc: rec.reason,
    fit: rec.fit,
    color: fitColor(rec.fit),
    details: {
      eligibility: [
        `Business profile: ${ds.business_type}.`,
        scoreLine,
        rec.fit === 'High'
          ? 'Strong alignment with this product for the assessed segment.'
          : rec.fit === 'Medium'
            ? 'Possible fit — lender may ask for additional proof or collateral.'
            : 'Weak fit for this segment in the demo model — explore alternatives below.',
      ],
      interestRate: rec.interest_rate ?? 'As per bank / NBFC (profile-dependent)',
      tenure: 'Varies by product (typically 12–120 months for term-style products)',
      maxAmount: formatMaxAmount(rec.max_amount),
      documents: [...GENERIC_DOCS],
      description: rec.reason,
    },
  }));
}
