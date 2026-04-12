/**
 * Feature engineering: raw MSME inputs → interpretable metrics.
 * No ML — deterministic transforms only.
 */

/**
 * @param {object} data
 * @param {number[]} data.monthly_sales
 * @param {number[]} data.monthly_expenses
 * @param {number} [data.digital_txn_ratio] 0–1
 * @param {boolean} [data.gst_filed]
 * @param {number} [data.loan_defaults] 0 or 1
 */
function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function stdDev(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  const sq = arr.reduce((s, x) => s + (x - m) ** 2, 0);
  return Math.sqrt(sq / arr.length);
}

function generateFeatures(data) {
  const sales = Array.isArray(data.monthly_sales) ? data.monthly_sales.map(Number) : [];
  const expenses = Array.isArray(data.monthly_expenses) ? data.monthly_expenses.map(Number) : [];

  const avgRevenue = mean(sales);
  const avgExpenses = mean(expenses);

  const profitMargin =
    avgRevenue > 0 ? (avgRevenue - avgExpenses) / avgRevenue : avgExpenses > 0 ? -1 : 0;

  const revenueStability = stdDev(sales);
  const expenseRatio = avgRevenue > 0 ? avgExpenses / avgRevenue : avgExpenses > 0 ? 2 : 0;

  const gstCompliance = data.gst_filed === true ? 1 : 0;
  const defaultRisk = Number(data.loan_defaults) === 1 ? 1 : 0;

  const digitalRaw =
    typeof data.digital_txn_ratio === 'number' && !Number.isNaN(data.digital_txn_ratio)
      ? Math.min(1, Math.max(0, data.digital_txn_ratio))
      : 0;
  /** 0–100 style digital adoption signal for explainability */
  const digitalScore = digitalRaw * 100;

  return {
    averageRevenue: avgRevenue,
    averageExpenses: avgExpenses,
    profitMargin,
    revenueStability,
    expenseRatio,
    gstCompliance,
    defaultRisk,
    digitalTxnRatio: digitalRaw,
    digitalScore,
  };
}

module.exports = { generateFeatures, mean, stdDev };
