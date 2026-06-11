const express = require('express');
const router = express.Router();
const { syncData, readJSON } = require('../services/dataFetcher');
const { predict } = require('../services/predictionEngine');

let syncInProgress = false;

// POST /api/sync — trigger a manual data sync
router.post('/', async (req, res) => {
  if (syncInProgress) {
    return res.status(429).json({ error: 'Sync already in progress' });
  }
  syncInProgress = true;
  try {
    const result = await syncData();

    // After sync, snapshot probabilities for history tracking
    if (result.status === 'success') {
      const teams = readJSON('teams.json') || [];
      const matches = readJSON('matches.json') || [];
      const weights = readJSON('weights.json');
      const predictions = predict(teams, matches, weights);
      const snapshot = { timestamp: result.timestamp, probabilities: {} };
      predictions.forEach(t => {
        snapshot.probabilities[t.teamId] = t.probability;
      });

      // Persist probability snapshots into each team's history
      const { writeJSON } = require('../services/dataFetcher');
      const updatedTeams = teams.map(team => {
        const prob = snapshot.probabilities[team.teamId];
        if (prob === undefined) return team;
        return {
          ...team,
          probabilityHistory: [
            ...(team.probabilityHistory || []),
            { timestamp: result.timestamp, probability: prob },
          ].slice(-50), // keep last 50 snapshots
        };
      });
      writeJSON('teams.json', updatedTeams);
    }

    res.json(result);
  } finally {
    syncInProgress = false;
  }
});

// GET /api/sync — sync log
router.get('/', (req, res) => {
  const log = readJSON('syncLog.json') || [];
  res.json(log);
});

module.exports = router;
