/**
 * Similarity: find nearest synthetic MSME in dataset (data-centric anchor).
 * Uses average revenue + digital_txn_ratio distance (weighted Euclidean).
 */

const { mean } = require('./featureEngineering');

/**
 * Per-record average revenue from monthly_sales
 */
function recordAvgRevenue(record) {
  return mean(record.monthly_sales || []);
}

/**
 * @typedef {object} NearestResult
 * @property {object} record - full dataset row
 * @property {number} id - 1-based index in dataset array (stable ID for demo)
 * @property {number} distance - lower is closer
 */

/**
 * @param {object} input - same shape as API body (monthly_sales, monthly_expenses, digital_txn_ratio, ...)
 * @param {object[]} dataset
 * @returns {NearestResult}
 */
function findNearestBusiness(input, dataset) {
  const inputSales = input.monthly_sales || [];
  const inputAvgRev = mean(inputSales.map(Number));
  const inputDigital =
    typeof input.digital_txn_ratio === 'number' && !Number.isNaN(input.digital_txn_ratio)
      ? Math.min(1, Math.max(0, input.digital_txn_ratio))
      : 0;

  // Scale revenue distance: typical MSME lakhs — normalize per-dataset in caller if needed
  const REV_WEIGHT = 1 / 50000; // ~1 unit per 50k INR avg monthly gap
  const DIG_WEIGHT = 2; // digital ratio is 0–1, give it comparable influence

  let best = null;
  let bestDist = Infinity;

  dataset.forEach((record, index) => {
    const rAvg = recordAvgRevenue(record);
    const rDig =
      typeof record.digital_txn_ratio === 'number'
        ? Math.min(1, Math.max(0, record.digital_txn_ratio))
        : 0;

    const dRev = (inputAvgRev - rAvg) * REV_WEIGHT;
    const dDig = (inputDigital - rDig) * DIG_WEIGHT;
    const distance = Math.sqrt(dRev * dRev + dDig * dDig);

    if (distance < bestDist) {
      bestDist = distance;
      best = { record, id: index + 1, distance };
    }
  });

  return best;
}

module.exports = { findNearestBusiness, recordAvgRevenue };
