/** Loan row from the judge demo dataset (per industry segment). */
export type SegmentLoanRecommendation = {
  loan_type: string;
  fit: 'High' | 'Medium' | 'Low';
  max_amount?: number;
  interest_rate?: string;
  reason: string;
};

export type SegmentLoanDataset = {
  business_type: string;
  /** Reference score for judge narrative (live OptilendScore shown separately on dashboard). */
  reference_credit_score: number;
  loan_recommendations: SegmentLoanRecommendation[];
};

/** Matches dashboard list + detail modal shape. */
export type DashboardLoanScheme = {
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

/** Aligns with scoring-layer / assessment `scoring_segment` values. */
export type SegmentId = 'auto_parts' | 'tailoring' | 'tech_startup';
