/**
 * Dataset statistics, normalization, rule-based score, and final blend.
 * Final score is intentionally driven by BOTH engineered rules AND nearest peer score.
 */

const { generateFeatures } = require('./featureEngineering');
const { findNearestBusiness, recordAvgRevenue } = require('./similarity');
const {
  computeAssessmentPillars,
  assessmentToLegacyPayload,
} = require('./assessmentScoring');

/** Peer corpus nudges assessment score slightly (data-centric demo) — pillars drive most of the outcome. */
const ASSESSMENT_PEER_BLEND = 0.12;

const SCORE_MIN = 300;
const SCORE_MAX = 900;

/**
 * @param {object[]} dataset
 * @returns {{ minRevenue: number, maxRevenue: number, averageRevenue: number }}
 */
function computeDatasetStats(dataset) {
  const avgs = dataset.map((r) => recordAvgRevenue(r)).filter((x) => Number.isFinite(x));
  if (avgs.length === 0) {
    return { minRevenue: 0, maxRevenue: 0, averageRevenue: 0 };
  }
  const minRevenue = Math.min(...avgs);
  const maxRevenue = Math.max(...avgs);
  const averageRevenue = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  return { minRevenue, maxRevenue, averageRevenue };
}

/**
 * Linear min–max normalize to [0, 1]. Handles flat range.
 */
function normalize(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return 0.5;
  const t = (value - min) / (max - min);
  return Math.min(1, Math.max(0, t));
}

/**
 * Map internal 0–1 health signal to OptilendScore band 300–900.
 */
function scaleToScore(t01) {
  return SCORE_MIN + t01 * (SCORE_MAX - SCORE_MIN);
}

/**
 * Rule-only score (300–900) from engineered features + dataset-relative normalization.
 */
function computeRuleScore(features, datasetStats) {
  const { minRevenue, maxRevenue, averageRevenue } = datasetStats;

  // How does this MSME sit vs the synthetic population?
  const revNorm = normalize(features.averageRevenue, minRevenue, maxRevenue);
  const marginClamped = Math.min(1, Math.max(-0.5, features.profitMargin));
  const marginNorm = (marginClamped + 0.5) / 1.5; // -0.5..1 -> 0..1

  // Lower expense ratio vs revenue is better
  const expRatio = Math.min(2, Math.max(0, features.expenseRatio));
  const expenseHealth = 1 - normalize(expRatio, 0, 1.2);

  // Stability: compare coefficient of variation to typical band
  const cv =
    features.averageRevenue > 0 ? features.revenueStability / features.averageRevenue : 1;
  const stabilityScore = 1 - normalize(cv, 0, 0.5);

  let health01 =
    revNorm * 0.22 +
    marginNorm * 0.28 +
    expenseHealth * 0.22 +
    stabilityScore * 0.13 +
    features.gstCompliance * 0.1 +
    features.digitalTxnRatio * 0.05;

  health01 -= features.defaultRisk * 0.35;
  health01 = Math.min(1, Math.max(0, health01));

  return Math.round(scaleToScore(health01));
}

/**
 * @param {object} input - API body
 * @param {object[]} dataset - loaded records
 * @returns {{
 *   score: number,
 *   explanation: {
 *     ruleScore: number,
 *     dataScore: number,
 *     nearestBusinessId: number,
 *     datasetSize: number,
 *     nearestDistance: number,
 *     features: object
 *   }
 * }}
 */
/**
 * Rich assessment (bank + GST + UPI + profile + behavior) → weighted pillars → score,
 * blended lightly with nearest synthetic MSME precomputed_score.
 * @param {object} assessment
 * @param {object[]} dataset
 */
function computeFinalAssessmentScore(assessment, dataset) {
  const pillarPack = computeAssessmentPillars(assessment);
  const legacyInput = assessmentToLegacyPayload(assessment);
  const corpus = computeFinalScore(legacyInput, dataset);
  const dataScore = corpus.explanation.dataScore;
  const assessmentRuleScore = pillarPack.assessmentRuleScore;
  const w = 1 - ASSESSMENT_PEER_BLEND;
  const blended = assessmentRuleScore * w + dataScore * ASSESSMENT_PEER_BLEND;
  const score = Math.round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, blended)));

  return {
    score,
    explanation: {
      mode: 'assessment',
      pillars: pillarPack.pillars,
      pillarWeights: pillarPack.weights,
      health01: pillarPack.health01,
      assessmentRuleScore,
      corpusRuleScore: corpus.explanation.ruleScore,
      dataScore,
      nearestBusinessId: corpus.explanation.nearestBusinessId,
      nearestDistance: corpus.explanation.nearestDistance,
      datasetSize: corpus.explanation.datasetSize,
      features: corpus.explanation.features,
      datasetStats: corpus.explanation.datasetStats,
      legacyMappedForSimilarity: legacyInput,
    },
  };
}

/**
 * @param {object} body
 * @returns {boolean}
 */
function isAssessmentPayload(body) {
  return (
    body != null &&
    typeof body === 'object' &&
    !Array.isArray(body.monthly_sales) &&
    Number.isFinite(Number(body.monthly_revenue)) &&
    Number(body.monthly_revenue) >= 0 &&
    body.bank_data != null &&
    typeof body.bank_data === 'object' &&
    !Array.isArray(body.bank_data)
  );
}

function computeFinalScore(input, dataset) {
  const datasetSize = dataset.length;
  const stats = computeDatasetStats(dataset);
  const features = generateFeatures(input);

  const ruleScore = computeRuleScore(features, stats);

  const nearest = findNearestBusiness(input, dataset);
  const dataScore = nearest && nearest.record.precomputed_score != null
    ? Number(nearest.record.precomputed_score)
    : SCORE_MIN;

  const blended = ruleScore * 0.6 + dataScore * 0.4;
  const score = Math.round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, blended)));

  return {
    score,
    explanation: {
      mode: 'legacy',
      ruleScore,
      dataScore,
      nearestBusinessId: nearest ? nearest.id : null,
      nearestDistance: nearest ? Number(nearest.distance.toFixed(4)) : null,
      datasetSize,
      features,
      datasetStats: stats,
    },
  };
}

module.exports = {
  computeDatasetStats,
  normalize,
  computeRuleScore,
  computeFinalScore,
  computeFinalAssessmentScore,
  isAssessmentPayload,
  ASSESSMENT_PEER_BLEND,
  SCORE_MIN,
  SCORE_MAX,
};
