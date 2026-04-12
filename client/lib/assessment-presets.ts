/**
 * Reference MSME profiles for judge demos — matches scoring-layer assessment schema.
 */

export type AssessmentSegmentId = 'auto_parts' | 'tailoring' | 'tech_startup';

export type AssessmentPayload = {
  /** Sent to scoring layer to apply a small sector multiplier (unique bands per profile). */
  scoring_segment?: AssessmentSegmentId;
  business_type?: string;
  monthly_revenue: number;
  registration_year?: number;
  employees?: number;
  location?: string;
  bank_data: {
    avg_balance: number;
    monthly_inflow: number;
    monthly_outflow: number;
    emi_payments?: number;
    emi_default: boolean;
    cash_deposit_ratio: number;
  };
  upi_transactions: {
    monthly_txn_count: number;
    avg_txn_value: number;
    failed_txn_rate: number;
  };
  gst_filings: {
    gst_registered: boolean;
    filing_frequency?: string;
    on_time_filing_rate: number | null;
    reported_turnover: number | null;
    mismatch_flag: boolean | null;
  };
  behavioral_score: {
    consistency: number;
    growth_trend: number;
  };
};

export const ASSESSMENT_PRESET_AUTO_PARTS: AssessmentPayload = {
  scoring_segment: 'auto_parts',
  business_type: 'Auto Parts Manufacturing',
  monthly_revenue: 500_000,
  registration_year: 2018,
  employees: 18,
  location: 'Pune, Maharashtra',
  bank_data: {
    avg_balance: 220_000,
    monthly_inflow: 520_000,
    monthly_outflow: 470_000,
    emi_payments: 2,
    emi_default: false,
    cash_deposit_ratio: 0.15,
  },
  upi_transactions: {
    monthly_txn_count: 320,
    avg_txn_value: 1200,
    failed_txn_rate: 0.02,
  },
  gst_filings: {
    gst_registered: true,
    filing_frequency: 'monthly',
    on_time_filing_rate: 0.95,
    reported_turnover: 480_000,
    mismatch_flag: false,
  },
  behavioral_score: {
    consistency: 0.9,
    growth_trend: 0.85,
  },
};

export const ASSESSMENT_PRESET_TAILORING: AssessmentPayload = {
  scoring_segment: 'tailoring',
  business_type: 'Tailoring & Garment Production',
  monthly_revenue: 250_000,
  registration_year: 2021,
  employees: 10,
  location: 'Chennai, Tamil Nadu',
  bank_data: {
    avg_balance: 60_000,
    monthly_inflow: 240_000,
    monthly_outflow: 220_000,
    emi_payments: 1,
    emi_default: false,
    cash_deposit_ratio: 0.35,
  },
  upi_transactions: {
    monthly_txn_count: 210,
    avg_txn_value: 600,
    failed_txn_rate: 0.05,
  },
  gst_filings: {
    gst_registered: true,
    filing_frequency: 'quarterly',
    on_time_filing_rate: 0.7,
    reported_turnover: 200_000,
    mismatch_flag: true,
  },
  behavioral_score: {
    consistency: 0.7,
    growth_trend: 0.6,
  },
};

export const ASSESSMENT_PRESET_SAAS: AssessmentPayload = {
  scoring_segment: 'tech_startup',
  business_type: 'Tech Startup (SaaS)',
  monthly_revenue: 120_000,
  registration_year: 2023,
  employees: 6,
  location: 'Bangalore, Karnataka',
  bank_data: {
    avg_balance: 150_000,
    monthly_inflow: 130_000,
    monthly_outflow: 180_000,
    emi_payments: 0,
    emi_default: false,
    cash_deposit_ratio: 0.05,
  },
  upi_transactions: {
    monthly_txn_count: 80,
    avg_txn_value: 1500,
    failed_txn_rate: 0.01,
  },
  gst_filings: {
    gst_registered: false,
    filing_frequency: 'none',
    on_time_filing_rate: null,
    reported_turnover: null,
    mismatch_flag: null,
  },
  behavioral_score: {
    consistency: 0.5,
    growth_trend: 0.9,
  },
};

export const ASSESSMENT_PRESETS: { id: string; label: string; hint: string; payload: AssessmentPayload }[] = [
  {
    id: 'auto',
    label: 'Auto parts manufacturing',
    hint: '~780–820 · strong GST, stable bank flow',
    payload: ASSESSMENT_PRESET_AUTO_PARTS,
  },
  {
    id: 'tailoring',
    label: 'Large tailoring unit',
    hint: '~600–680 · GST mismatch, higher cash',
    payload: ASSESSMENT_PRESET_TAILORING,
  },
  {
    id: 'saas',
    label: 'Early-stage SaaS',
    hint: '~550–650 · burn, no GST, high growth signal',
    payload: ASSESSMENT_PRESET_SAAS,
  },
];
