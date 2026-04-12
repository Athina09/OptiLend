# Optilend — Scoring Layer

Standalone **Node.js (Express)** API for **explainable** MSME credit scoring (**300–900**). No ML libraries: **feature engineering** + **similarity to a synthetic corpus** + **weighted blend**. Supports two request shapes: **legacy (monthly series)** and **rich assessment (bank + GST + UPI + profile)**.

## Quick start

```bash
cd scoring-layer
npm install
npm start
```

- **Base URL:** `http://localhost:5055` (override with `PORT`)
- **Health:** `GET /health`
- **Score:** `POST /score`

> Run `npm install` on its own line. Avoid `npm install # comment` in some shells.

If port **5055** is busy:

```bash
PORT=5051 npm start
# or
npm run start:5051
```

## Integration with the Next client

The UI posts to **`POST /api/score`** in the Next app, which proxies to this service:

| Variable (client) | Used in | Purpose |
|-------------------|---------|---------|
| `SCORING_API_URL` | `client/app/api/score/route.ts` | Server-side proxy to `{SCORING_API_URL}/score` (default `http://127.0.0.1:5055`) |
| `NEXT_PUBLIC_SCORING_LAYER_URL` | `client/lib/scoring-api.ts` | Optional browser-direct URL to the same `/score` endpoint |

Ensure this layer is running before opening the MSME dashboard, or the meter will show a connection error.

## Project layout

| Path | Purpose |
|------|---------|
| `server.js` | Express app; loads `data/dataset.json` into `app.locals.dataset` |
| `routes/score.js` | Mounts `POST /` on `/score` → controller |
| `controllers/scoreController.js` | Validates body, chooses mode, returns `{ score, explanation }` |
| `utils/featureEngineering.js` | Legacy inputs → `generateFeatures()` (averages, margin, volatility, flags) |
| `utils/similarity.js` | `findNearestBusiness()` — distance in avg revenue + digital ratio |
| `utils/scoring.js` | Dataset stats, `computeRuleScore`, `computeFinalScore`, **assessment** blend |
| `utils/assessmentScoring.js` | Five pillars → `assessmentRuleScore`; maps assessment → legacy-like payload for similarity |
| `data/dataset.json` | Synthetic MSME corpus (each row includes `precomputed_score`) |

## How the score is generated

### Corpus (`data/dataset.json`)

Each record includes **`monthly_sales`**, **`monthly_expenses`**, **`digital_txn_ratio`**, **`gst_filed`**, **`loan_defaults`**, and **`precomputed_score`** (a 300–900 anchor for that synthetic business). The server loads the file **once** at startup.

### Mode A — Legacy / demo (`monthly_sales` + `monthly_expenses`)

Used when the body contains **non-empty** `monthly_sales` / `monthly_expenses` arrays (typical dashboard slider demo).

1. **Features** (`featureEngineering.js`): average revenue/expenses, profit margin, revenue stability (std dev of sales), expense ratio, `gstCompliance`, `defaultRisk`, `digitalTxnRatio`.
2. **Dataset statistics** (`scoring.js`): over all corpus rows, min / max / mean of **per-record average monthly sales** — used to normalize the applicant vs the population.
3. **Rule score** (`computeRuleScore`): weighted combination of normalized revenue position, margin, expense health, stability, GST, digital, minus a default penalty → mapped to **300–900**.
4. **Data score** (`similarity.js`): weighted Euclidean distance in **(average monthly revenue, digital_txn_ratio)**; **`dataScore`** = nearest row’s **`precomputed_score`** (or 300 if missing).
5. **Final score:**

   ```text
   final = clamp( round( 0.6 × ruleScore + 0.4 × dataScore ), 300, 900 )
   ```

### Mode B — Assessment (`monthly_revenue` + `bank_data`)

Detected when the body has **`monthly_revenue`** and **`bank_data`** and **does not** use the legacy `monthly_sales` array shape (`isAssessmentPayload` in `scoring.js`).

1. **Pillars** (`assessmentScoring.js`): five signals in **0–1**, then weighted:

   | Pillar | Weight |
   |--------|--------|
   | Bank stability | 35% |
   | GST compliance | 25% |
   | UPI behavior | 15% |
   | Business profile | 15% |
   | Growth signal | 10% |

   Optional **`scoring_segment`**: `auto_parts` | `tailoring` | `tech_startup` applies a small demo multiplier. Result → **`assessmentRuleScore`** (300–900).

2. **Peer score**: assessment is converted to a **synthetic legacy payload** (`assessmentToLegacyPayload`) so the **same** nearest-neighbour search runs → **`dataScore`** = nearest **`precomputed_score`**.

3. **Final score:**

   ```text
   ASSESSMENT_PEER_BLEND = 0.12
   final = clamp( round( 0.88 × assessmentRuleScore + 0.12 × dataScore ), 300, 900 )
   ```

So **assessment is pillar-driven**; the corpus adds a **small** data-centric nudge.

### Summary

| Mode | Rule side | Data side | Blend |
|------|-----------|-----------|--------|
| Legacy | `ruleScore` from time series + flags | Nearest row `precomputed_score` | **60% / 40%** |
| Assessment | `assessmentRuleScore` from five pillars | Same nearest `precomputed_score` | **~88% / ~12%** |

Changing **`dataset.json`** changes normalization bounds, the nearest peer, and **`dataScore`** — the pipeline stays **corpus-aware**.

## API

### `GET /health`

```json
{ "ok": true, "service": "optilend-scoring-layer", "datasetRecords": 52 }
```

(`datasetRecords` reflects the loaded array length.)

### `POST /score` — Legacy body

**Headers:** `Content-Type: application/json`

```json
{
  "monthly_sales": [120000, 125000, 118000, 130000, 122000, 128000],
  "monthly_expenses": [72000, 74000, 71000, 76000, 73000, 75000],
  "digital_txn_ratio": 0.65,
  "gst_filed": true,
  "loan_defaults": 0
}
```

- Arrays must be non-empty; `digital_txn_ratio` ∈ [0, 1]; `gst_filed` boolean; `loan_defaults` ∈ {0, 1}.

**Response** includes `mode: "legacy"`, `ruleScore`, `dataScore`, `nearestBusinessId`, `nearestDistance`, `features`, `blend`, `inputEcho`, etc.

### `POST /score` — Assessment body (abbreviated)

Requires at least **`monthly_revenue`** (≥ 0) and **`bank_data`** with numeric **`avg_balance`**, **`monthly_inflow`**, **`monthly_outflow`**. Optional nested objects: **`gst_filings`**, **`upi_transactions`**, **`behavioral_score`**, **`scoring_segment`**, etc. See **`controllers/scoreController.js`** (`validateAssessmentBody`) for full rules.

**Response** includes `mode: "assessment"`, **`pillars`**, **`pillarWeights`**, **`assessmentRuleScore`**, **`creditTier`**, **`dataScore`**, nearest peer fields, and a **`blend`** note with pillar vs peer weights.

### Example `curl` (legacy)

```bash
curl -s http://localhost:5055/health

curl -s -X POST http://localhost:5055/score \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_sales": [100000, 110000, 105000],
    "monthly_expenses": [60000, 65000, 62000],
    "digital_txn_ratio": 0.5,
    "gst_filed": true,
    "loan_defaults": 0
  }'
```

## Logs

Each `POST /score` logs dataset size, nearest ID / distance, and rule vs data scores (wording varies by mode).

## Scripts

| Script | Command |
|--------|---------|
| Start (default **5055**) | `npm start` |
| Start on **5051** | `npm run start:5051` |

## Licence / disclaimer

Demo / hackathon use. Not production credit advice. Real deployments need regulated data flows, legal review, and audited models.
