# Loan recommendation layer

**Segment-specific loan recommendation data** and helpers that map it into the **dashboard loan card** shape (name, fit, eligibility copy, rates, documents, etc.). Lives next to **`scoring-layer/`** so product logic stays out of huge React files.

## Contents

| Path | Purpose |
|------|---------|
| `data/segment-loan-datasets.json` | Per-segment demo data: `business_type`, `reference_credit_score`, `loan_recommendations[]` |
| `src/types.ts` | TypeScript types: `SegmentId`, `SegmentLoanRecommendation`, `SegmentLoanDataset`, `DashboardLoanScheme` |
| `src/datasets.ts` | Loads JSON → `SEGMENT_LOAN_DATASETS` |
| `src/map-to-dashboard.ts` | `loanSchemesForSegment(segment, liveScore)` — builds UI-ready cards |
| `src/index.ts` | Public exports |

## Segment IDs

**`SegmentId`** matches assessment / scoring: **`auto_parts`**, **`tailoring`**, **`tech_startup`**. These align with **`scoring_segment`** on assessment payloads and the MSME assessment bridge.

## Using from the Next client

**`client/tsconfig.json`** maps:

- `@loan-recommendation-layer` → `../loan-recommendation-layer/src/index.ts`

**`client/next.config.js`** sets `experimental.externalDir: true` so Next can compile this sibling folder.

Example import:

```ts
import {
  loanSchemesForSegment,
  SEGMENT_LOAN_DATASETS,
  type DashboardLoanScheme,
} from '@loan-recommendation-layer';
```

The MSME dashboard uses this when the user’s profile / explanation includes a known segment; otherwise it falls back to generic static schemes.

## Editing recommendations

1. Update **`data/segment-loan-datasets.json`** for copy, fits, optional `max_amount` / `interest_rate`.
2. If you add a segment, extend **`SegmentId`** in **`src/types.ts`**, add the JSON key, and ensure **`assessment-presets`** / scoring **`scoring_segment`** stay in sync.

## Disclaimer

Demo / illustrative loan text only. Not financial or legal advice.
