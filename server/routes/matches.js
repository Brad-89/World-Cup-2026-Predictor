const express = require('express');
const router = express.Router();
const { readJSON, writeJSON } = require('../services/dataFetcher');

// GET /api/matches
router.get('/', (req, res) => {
  try {
    const matches = readJSON('matches.json') || [];
    const { status, stage } = req.query;
    let result = matches;
    if (status) result = result.filter(m => m.status === status);
    if (stage) result = result.filter(m => m.stage === stage);
    res.json(result.sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/matches — manually enter a match result (admin)
router.post('/', (req, res) => {
  try {
    const matches = readJSON('matches.json') || [];
    const incoming = req.body;

    if (!incoming.matchId) {
      incoming.matchId = `manual_${Date.now()}`;
    }
    if (!incoming.date) incoming.date = new Date().toISOString();
    if (!incoming.status) incoming.status = 'FINISHED';

    const idx = matches.findIndex(m => m.matchId === incoming.matchId);
    if (idx >= 0) matches[idx] = { ...matches[idx], ...incoming };
    else matches.push(incoming);

    writeJSON('matches.json', matches);

    // Rebuild team stats after manual entry
    const { rebuildTeamStats } = require('../services/dataFetcher');
    const teams = readJSON('teams.json') || [];
    const rebuilt = rebuildTeamStats(teams, matches);
    writeJSON('teams.json', rebuilt);

    res.json({ success: true, matchId: incoming.matchId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
