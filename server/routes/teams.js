const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../services/dataFetcher');
const { predict } = require('../services/predictionEngine');

// GET /api/teams — all teams with current probabilities
router.get('/', (req, res) => {
  try {
    const teams = readJSON('teams.json') || [];
    const matches = readJSON('matches.json') || [];
    const weights = readJSON('weights.json');
    const predictions = predict(teams, matches, weights);
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teams/:id — single team with full breakdown
router.get('/:id', (req, res) => {
  try {
    const teams = readJSON('teams.json') || [];
    const matches = readJSON('matches.json') || [];
    const weights = readJSON('weights.json');
    const predictions = predict(teams, matches, weights);
    const team = predictions.find(t => t.teamId === req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teams — manually add/update a team (admin)
router.post('/', (req, res) => {
  try {
    const teams = readJSON('teams.json') || [];
    const incoming = req.body;
    const idx = teams.findIndex(t => t.teamId === incoming.teamId);
    if (idx >= 0) teams[idx] = { ...teams[idx], ...incoming };
    else teams.push(incoming);
    writeJSON('teams.json', teams);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/teams/:id/probability-history — append a probability snapshot
router.patch('/:id/probability-history', (req, res) => {
  try {
    const teams = readJSON('teams.json') || [];
    const matches = readJSON('matches.json') || [];
    const weights = readJSON('weights.json');
    const predictions = predict(teams, matches, weights);
    const predicted = predictions.find(t => t.teamId === req.params.id);
    if (!predicted) return res.status(404).json({ error: 'Team not found' });

    const idx = teams.findIndex(t => t.teamId === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Team not found' });

    teams[idx].probabilityHistory = teams[idx].probabilityHistory || [];
    teams[idx].probabilityHistory.push({
      timestamp: new Date().toISOString(),
      probability: predicted.probability,
    });

    writeJSON('teams.json', teams);
    res.json({ success: true, history: teams[idx].probabilityHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
