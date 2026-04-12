import raw from '../data/segment-loan-datasets.json';
import type { SegmentId, SegmentLoanDataset } from './types';

export const SEGMENT_LOAN_DATASETS = raw as Record<SegmentId, SegmentLoanDataset>;
