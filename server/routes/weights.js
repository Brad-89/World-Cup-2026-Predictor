const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../services/dataFetcher');

// GET /api/weights
router.get('/', (req, res) => {
  try {
    const weights = readJSON('weights.json');
    res.json(weights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/weights — update model weights (admin)
router.put('/', (req, res) => {
  try {
    const incoming = req.body;
    const current = readJSON('weights.json');

    // Validate numeric values
    const numericKeys = [
      'goalsFor', 'goalsAgainst', 'shotAccuracy', 'shotsOnTarget',
      'possession', 'passAccuracy', 'form', 'opponentStrength',
      'knockoutBonus', 'headToHead', 'formDecayLambda',
    ];

    const updated = { ...current };
    numericKeys.forEach(key => {
      if (incoming[key] !== undefined) {
        const val = parseFloat(incoming[key]);
        if (isNaN(val)) throw new Error(`Invalid value for ${key}`);
        updated[key] = val;
      }
    });

    if (incoming.knockoutMultipliers) {
      updated.knockoutMultipliers = {
        ...current.knockoutMultipliers,
        ...incoming.knockoutMultipliers,
      };
    }

    writeJSON('weights.json', updated);
    res.json({ success: true, weights: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/weights/reset — restore defaults
router.post('/reset', (req, res) => {
  const defaults = {
    goalsFor: 0.20,
    goalsAgainst: 0.18,
    shotAccuracy: 0.12,
    shotsOnTarget: 0.10,
    possession: 0.08,
    passAccuracy: 0.07,
    form: 0.15,
    opponentStrength: 0.05,
    knockoutBonus: 0.05,
    headToHead: 0.00,
    formDecayLambda: 0.35,
    knockoutMultipliers: {
      Group: 1.0, R32: 1.05, R16: 1.12, QF: 1.22, SF: 1.35, F: 1.50,
    },
  };
  writeJSON('weights.json', defaults);
  res.json({ success: true, weights: defaults });
});

module.exports = router;
