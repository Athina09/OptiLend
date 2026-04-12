# Optilend — Scoring Layer

Standalone **Node.js (Express)** API for **data-centric**, **explainable** MSME credit scoring. No ML libraries: **feature engineering** + **similarity to a synthetic corpus** + **weighted blend**.

## Quick start

```bash
cd scoring-layer
npm install
npm start
```

- **Default URL:** `http://localhost:5055` (set `PORT` to override).
- **Health:** `GET /health`
- **Score:** `POST /score`

> **Note:** Run `npm install` on its own line. Do not paste `npm install # comment` — some shells/npm versions treat `#` badly.

If the port is busy:

```bash
PORT=5051 npm start
# or
npm run start:5051
```

## Project layout

| Path | Purpose |
|------|---------|
| `server.js` | Express app, loads `data/dataset.json` once |
| `routes/score.js` | `POST /` → controller |
| `controllers/scoreController.js` | Validation, logging, JSON response |
| `utils/featureEngineering.js` | `generateFeatures(input)` |
| `utils/similarity.js` | `findNearestBusiness(input, dataset)` |
| `utils/scoring.js` | `computeDatasetStats`, `normalize`, `computeFinalScore` |
| `data/dataset.json` | ≥50 synthetic MSME records (corpus) |

## How scoring works

1. **Features** — From `monthly_sales`, `monthly_expenses`, `digital_txn_ratio`, `gst_filed`, `loan_defaults` compute averages, profit margin, revenue stability (std dev), expense ratio, compliance flags, etc.

2. **Dataset statistics** — Over all rows in `dataset.json`, compute min / max / mean of **per-record average monthly sales**. Used to **normalize** the applicant vs the corpus.

3. **Rule score (300–900)** — Deterministic weighted mix of normalized signals (revenue position, margin, expense health, stability, GST, digital, default penalty).

4. **Nearest neighbour** — Weighted distance in **(avg revenue, digital_txn_ratio)** vs each corpus row. **`dataScore`** = that row’s **`precomputed_score`**.

5. **Final score**

   ```text
   finalScore = clamp( round( ruleScore × 0.6 + dataScore × 0.4 ), 300, 900 )
   ```

Changing **`dataset.json`** changes min/max bounds, the nearest peer, and **`dataScore`** — so the pipeline is **corpus-driven**, not a single hardcoded number.

## API

### `GET /health`

```json
{ "ok": true, "service": "optilend-scoring-layer", "datasetRecords": 52 }
```

### `POST /score`

**Headers:** `Content-Type: application/json`

**Body:**

```json
{
  "monthly_sales": [120000, 125000, 118000, 130000, 122000, 128000],
  "monthly_expenses": [72000, 74000, 71000, 76000, 73000, 75000],
  "digital_txn_ratio": 0.65,
  "gst_filed": true,
  "loan_defaults": 0
}
```

**Rules:**

- `monthly_sales` / `monthly_expenses`: non-empty arrays of numbers.
- `digital_txn_ratio`: number in `[0, 1]`.
- `gst_filed`: boolean.
- `loan_defaults`: `0` or `1`.

**Response:**

```json
{
  "score": 645,
  "explanation": {
    "ruleScore": 665,
    "dataScore": 614,
    "nearestBusinessId": 28,
    "datasetSize": 52,
    "nearestPeerPrecomputedScore": 614
  }
}
```

### Example `curl`

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

## Demo logs

Each `POST /score` prints:

- `Using dataset of size X`
- `Nearest business found: ID …`
- `Rule score vs Data score: …`

## Scripts

| Script | Command |
|--------|---------|
| Start (default port **5055**) | `npm start` |
| Start on **5051** | `npm run start:5051` |

## Licence / disclaimer

Demo / hackathon use. Not production credit advice. Integrate real FIU/AA, legal review, and audited models before any live decisioning.
