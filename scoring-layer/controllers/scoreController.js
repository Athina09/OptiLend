const {
  computeFinalScore,
  computeFinalAssessmentScore,
  isAssessmentPayload,
  ASSESSMENT_PEER_BLEND,
} = require('../utils/scoring');
const { recordAvgRevenue } = require('../utils/similarity');

const ASSESSMENT_SEGMENTS = new Set(['auto_parts', 'tailoring', 'tech_startup']);

function creditTierFromScore(score) {
  if (!Number.isFinite(score)) return null;
  if (score >= 760) {
    return {
      tier: 'strong',
      label: 'Strong creditworthiness',
      summary: 'Strong formal discipline, stable bank signals, and GST alignment.',
    };
  }
  if (score >= 610) {
    return {
      tier: 'moderate',
      label: 'Medium / elevated watch',
      summary: 'Mixed formality or GST frictions — monitor cash and compliance.',
    };
  }
  return {
    tier: 'elevated',
    label: 'Higher uncertainty',
    summary: 'Early-stage, burn, or weak formal footprint — underwriting needs extra checks.',
  };
}

function validateLegacyBody(body, res) {
  const requiredArrays = ['monthly_sales', 'monthly_expenses'];
  for (const k of requiredArrays) {
    if (!Array.isArray(body[k]) || body[k].length === 0) {
      res.status(400).json({ error: `Missing or empty array: ${k}` });
      return false;
    }
  }
  if (typeof body.digital_txn_ratio !== 'number' || body.digital_txn_ratio < 0 || body.digital_txn_ratio > 1) {
    res.status(400).json({ error: 'digital_txn_ratio must be a number between 0 and 1' });
    return false;
  }
  if (typeof body.gst_filed !== 'boolean') {
    res.status(400).json({ error: 'gst_filed must be boolean' });
    return false;
  }
  const ld = Number(body.loan_defaults);
  if (ld !== 0 && ld !== 1) {
    res.status(400).json({ error: 'loan_defaults must be 0 or 1' });
    return false;
  }
  return true;
}

function validateAssessmentBody(body, res) {
  if (!Number.isFinite(Number(body.monthly_revenue)) || Number(body.monthly_revenue) < 0) {
    res.status(400).json({ error: 'monthly_revenue is required (number ≥ 0)' });
    return false;
  }
  const bd = body.bank_data;
  if (!bd || typeof bd !== 'object') {
    res.status(400).json({ error: 'bank_data object is required' });
    return false;
  }
  for (const k of ['avg_balance', 'monthly_inflow', 'monthly_outflow']) {
    if (!Number.isFinite(Number(bd[k]))) {
      res.status(400).json({ error: `bank_data.${k} must be a finite number` });
      return false;
    }
  }
  if (bd.cash_deposit_ratio != null) {
    const c = Number(bd.cash_deposit_ratio);
    if (!Number.isFinite(c) || c < 0 || c > 1) {
      res.status(400).json({ error: 'bank_data.cash_deposit_ratio must be between 0 and 1' });
      return false;
    }
  }
  if (bd.emi_default != null && typeof bd.emi_default !== 'boolean') {
    res.status(400).json({ error: 'bank_data.emi_default must be boolean when provided' });
    return false;
  }
  if (body.scoring_segment != null && !ASSESSMENT_SEGMENTS.has(String(body.scoring_segment))) {
    res.status(400).json({
      error: 'scoring_segment must be one of: auto_parts, tailoring, tech_startup',
    });
    return false;
  }
  return true;
}

function buildFeaturesBlock(f) {
  const fx = f || {};
  return {
    averageRevenue: fx.averageRevenue,
    averageExpenses: fx.averageExpenses,
    profitMargin: fx.profitMargin,
    revenueStability: fx.revenueStability,
    expenseRatio: fx.expenseRatio,
    gstCompliance: fx.gstCompliance,
    defaultRisk: fx.defaultRisk,
    digitalTxnRatio: fx.digitalTxnRatio,
    digitalScore: fx.digitalScore,
  };
}

/**
 * POST /score — legacy monthly arrays **or** rich assessment (monthly_revenue + bank_data + …).
 */
function postScore(req, res) {
  const body = req.body || {};
  const dataset = req.app.locals.dataset;

  if (!Array.isArray(dataset) || dataset.length === 0) {
    return res.status(500).json({ error: 'Dataset not loaded' });
  }

  console.log(`[Optilend Score] Using dataset of size ${dataset.length}`);

  if (isAssessmentPayload(body)) {
    if (!validateAssessmentBody(body, res)) return;

    const result = computeFinalAssessmentScore(body, dataset);
    const ex = result.explanation;
    const peer =
      ex.nearestBusinessId != null && dataset[ex.nearestBusinessId - 1]
        ? dataset[ex.nearestBusinessId - 1]
        : null;

    const wPeer = ASSESSMENT_PEER_BLEND;
    const wPillar = 1 - wPeer;

    console.log(
      `[Optilend Assessment] Pillars → ${ex.assessmentRuleScore}, peer data ${ex.dataScore} → final ${result.score}`
    );

    return res.json({
      score: result.score,
      explanation: {
        mode: 'assessment',
        businessType: body.business_type ?? null,
        scoring_segment: body.scoring_segment ?? null,
        creditTier: creditTierFromScore(result.score),
        pillars: ex.pillars,
        pillarWeights: ex.pillarWeights,
        health01: ex.health01,
        assessmentRuleScore: ex.assessmentRuleScore,
        corpusRuleScore: ex.corpusRuleScore,
        dataScore: ex.dataScore,
        nearestBusinessId: ex.nearestBusinessId,
        datasetSize: ex.datasetSize,
        nearestDistance:
          ex.nearestDistance != null && Number.isFinite(ex.nearestDistance)
            ? Number(Number(ex.nearestDistance).toFixed(4))
            : null,
        nearestPeerAvgRevenue: peer ? Math.round(recordAvgRevenue(peer)) : null,
        nearestPeerDigitalRatio:
          peer && typeof peer.digital_txn_ratio === 'number' ? peer.digital_txn_ratio : null,
        nearestPeerPrecomputedScore: peer ? peer.precomputed_score : null,
        features: buildFeaturesBlock(ex.features),
        legacyMappedForSimilarity: ex.legacyMappedForSimilarity,
        blend: {
          pillarWeight: wPillar,
          peerWeight: wPeer,
          formula: `round(clamp(${wPillar}×${ex.assessmentRuleScore} + ${wPeer}×${ex.dataScore})) → ${result.score}`,
          note:
            'Pillar score = bank_stability×0.35 + gst_compliance×0.25 + upi_behavior×0.15 + business_profile×0.15 + growth_signal×0.10 (each 0–1), mapped to 300–900. Peer precomputed_score adds a small data-centric nudge.',
        },
        inputEcho: {
          monthly_revenue: Number(body.monthly_revenue),
          location: body.location ?? null,
          registration_year: body.registration_year ?? null,
          employees: body.employees ?? null,
          scoring_segment: body.scoring_segment ?? null,
        },
      },
    });
  }

  if (!validateLegacyBody(body, res)) return;

  const result = computeFinalScore(body, dataset);
  const {
    ruleScore,
    dataScore,
    nearestBusinessId,
    datasetSize,
    nearestDistance,
    features,
  } = result.explanation;

  const ld = Number(body.loan_defaults);

  console.log(`[Optilend Score] Nearest business found: ID ${nearestBusinessId} (distance=${nearestDistance})`);
  console.log(`[Optilend Score] Rule score vs Data score: ${ruleScore} vs ${dataScore} → final ${result.score}`);

  const peer =
    nearestBusinessId != null && dataset[nearestBusinessId - 1]
      ? dataset[nearestBusinessId - 1]
      : null;

  const f = features || {};
  res.json({
    score: result.score,
    explanation: {
      mode: 'legacy',
      ruleScore,
      dataScore,
      nearestBusinessId,
      datasetSize,
      nearestDistance:
        nearestDistance != null && Number.isFinite(nearestDistance)
          ? Number(Number(nearestDistance).toFixed(4))
          : null,
      nearestPeerAvgRevenue: peer ? Math.round(recordAvgRevenue(peer)) : null,
      nearestPeerDigitalRatio:
        peer && typeof peer.digital_txn_ratio === 'number' ? peer.digital_txn_ratio : null,
      nearestPeerPrecomputedScore: peer ? peer.precomputed_score : null,
      features: {
        averageRevenue: f.averageRevenue,
        averageExpenses: f.averageExpenses,
        profitMargin: f.profitMargin,
        revenueStability: f.revenueStability,
        expenseRatio: f.expenseRatio,
        gstCompliance: f.gstCompliance,
        defaultRisk: f.defaultRisk,
        digitalTxnRatio: f.digitalTxnRatio,
        digitalScore: f.digitalScore,
      },
      blend: {
        ruleWeight: 0.6,
        dataWeight: 0.4,
        formula: `round(clamp(0.6×${ruleScore} + 0.4×${dataScore})) → ${result.score}`,
        note:
          'Rule leg reacts to margins, expense ratio, revenue stability, GST filed, loan default, and digital share. Data leg is the nearest row’s precomputed_score.',
      },
      inputEcho: {
        gst_filed: body.gst_filed,
        loan_defaults: ld,
        digital_txn_ratio: body.digital_txn_ratio,
        monthly_points: body.monthly_sales.length,
      },
    },
  });
}

module.exports = { postScore };
