/**
 * Prediction Engine for World Cup 2026 Winner Predictor
 *
 * Calculates win probability for each team using a weighted statistical model.
 * All weights are externalised to weights.json — no magic numbers here.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

function loadWeights() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'weights.json'), 'utf8'));
}

/**
 * Compute exponentially-decayed form score for a team.
 * Recent games are weighted more heavily via e^(-lambda * gameIndex).
 * gameIndex 0 = most recent game.
 *
 * @param {Object} team - Team profile
 * @param {Array} matches - All completed matches
 * @param {number} lambda - Decay rate (higher = faster decay for older games)
 * @returns {number} Normalised form score in [0, 1]
 */
function computeFormScore(team, matches, lambda) {
  const teamMatches = matches
    .filter(
      m =>
        m.status === 'FINISHED' &&
        (m.homeTeamId === team.teamId || m.awayTeamId === team.teamId)
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first

  if (teamMatches.length === 0) return 0.5;

  let weightedScore = 0;
  let totalWeight = 0;

  teamMatches.forEach((match, index) => {
    const weight = Math.exp(-lambda * index);
    const isHome = match.homeTeamId === team.teamId;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const oppScore = isHome ? match.awayScore : match.homeScore;

    let result;
    if (teamScore > oppScore) result = 1.0;
    else if (teamScore === oppScore) result = 0.5;
    else result = 0.0;

    weightedScore += result * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedScore / totalWeight : 0.5;
}

/**
 * Compute opponent strength factor.
 * Goals scored against strong opponents count more; goals conceded against weak teams penalise less.
 * Strength is approximated by opponent FIFA ranking (if available) or stage reached.
 *
 * @param {Object} team
 * @param {Array} matches
 * @param {Array} allTeams
 * @returns {number} Adjustment multiplier in [0.8, 1.2]
 */
function computeOpponentStrengthFactor(team, matches, allTeams) {
  const teamMatches = matches.filter(
    m =>
      m.status === 'FINISHED' &&
      (m.homeTeamId === team.teamId || m.awayTeamId === team.teamId)
  );

  if (teamMatches.length === 0) return 1.0;

  const stageRank = { Group: 1, R32: 2, R16: 3, QF: 4, SF: 5, F: 6 };
  let totalStrength = 0;

  teamMatches.forEach(match => {
    const oppId =
      match.homeTeamId === team.teamId ? match.awayTeamId : match.homeTeamId;
    const opp = allTeams.find(t => t.teamId === oppId);
    const oppStage = opp ? stageRank[opp.currentStage] || 1 : 1;
    totalStrength += oppStage;
  });

  const avgOppStrength = totalStrength / teamMatches.length;
  // Normalise: average stage rank ~2 → factor 1.0; higher → bonus
  return Math.min(1.2, Math.max(0.8, 0.9 + avgOppStrength * 0.05));
}

/**
 * Compute knockout stage bonus multiplier.
 * Teams that have survived further rounds get a confidence boost.
 *
 * @param {Object} team
 * @param {Object} multipliers - Stage multiplier config
 * @returns {number}
 */
function knockoutBonus(team, multipliers) {
  return multipliers[team.currentStage] || 1.0;
}

/**
 * Normalise a raw value to [0, 1] given league-wide min/max.
 */
function normalise(value, min, max) {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Compute raw scores for every team across all statistical dimensions.
 * Returns an array of { team, rawScores } objects.
 *
 * @param {Array} teams
 * @param {Array} matches
 * @param {Object} weights
 * @returns {Array}
 */
function computeRawScores(teams, matches, weights) {
  return teams.map(team => {
    const gamesPlayed = team.gamesPlayed || 1;

    const goalsForPerGame = team.goalsFor / gamesPlayed;
    const goalsAgainstPerGame = team.goalsAgainst / gamesPlayed;
    const shotAccuracy =
      team.shotsTotal > 0 ? team.shotsOnTarget / team.shotsTotal : 0;
    const shotsOnTargetPerGame = team.shotsOnTarget / gamesPlayed;
    const possession = team.possession / 100; // already a ratio
    const passAccuracy = team.passAccuracy / 100;
    const form = computeFormScore(team, matches, weights.formDecayLambda);
    const oppStrength = computeOpponentStrengthFactor(team, matches, teams);
    const kBonus = knockoutBonus(team, weights.knockoutMultipliers);

    return {
      team,
      rawScores: {
        goalsFor: goalsForPerGame,
        goalsAgainst: goalsAgainstPerGame, // lower is better — inverted later
        shotAccuracy,
        shotsOnTarget: shotsOnTargetPerGame,
        possession,
        passAccuracy,
        form,
        opponentStrength: oppStrength,
        knockoutBonus: kBonus,
      },
    };
  });
}

/**
 * Main prediction function.
 * Returns all teams sorted by win probability descending, with breakdown per factor.
 *
 * @param {Array} teams - Team profiles from teams.json
 * @param {Array} matches - Match records from matches.json
 * @param {Object} [customWeights] - Override weights (optional)
 * @returns {Array} Teams with .probability and .breakdown added
 */
function predict(teams, matches, customWeights) {
  if (!teams || teams.length === 0) return [];

  const weights = customWeights || loadWeights();
  const rawData = computeRawScores(teams, matches, weights);

  // Compute per-dimension min/max for normalisation
  const dims = [
    'goalsFor',
    'goalsAgainst',
    'shotAccuracy',
    'shotsOnTarget',
    'possession',
    'passAccuracy',
    'form',
    'opponentStrength',
    'knockoutBonus',
  ];

  const ranges = {};
  dims.forEach(dim => {
    const vals = rawData.map(d => d.rawScores[dim]);
    ranges[dim] = { min: Math.min(...vals), max: Math.max(...vals) };
  });

  // Score each team
  const scored = rawData.map(({ team, rawScores }) => {
    const norm = {};

    norm.goalsFor = normalise(
      rawScores.goalsFor,
      ranges.goalsFor.min,
      ranges.goalsFor.max
    );
    // Invert goals against — fewer is better
    norm.goalsAgainst =
      1 -
      normalise(
        rawScores.goalsAgainst,
        ranges.goalsAgainst.min,
        ranges.goalsAgainst.max
      );
    norm.shotAccuracy = normalise(
      rawScores.shotAccuracy,
      ranges.shotAccuracy.min,
      ranges.shotAccuracy.max
    );
    norm.shotsOnTarget = normalise(
      rawScores.shotsOnTarget,
      ranges.shotsOnTarget.min,
      ranges.shotsOnTarget.max
    );
    norm.possession = normalise(
      rawScores.possession,
      ranges.possession.min,
      ranges.possession.max
    );
    norm.passAccuracy = normalise(
      rawScores.passAccuracy,
      ranges.passAccuracy.min,
      ranges.passAccuracy.max
    );
    norm.form = normalise(rawScores.form, ranges.form.min, ranges.form.max);
    norm.opponentStrength = normalise(
      rawScores.opponentStrength,
      ranges.opponentStrength.min,
      ranges.opponentStrength.max
    );
    norm.knockoutBonus = normalise(
      rawScores.knockoutBonus,
      ranges.knockoutBonus.min,
      ranges.knockoutBonus.max
    );

    const composite =
      norm.goalsFor * weights.goalsFor +
      norm.goalsAgainst * weights.goalsAgainst +
      norm.shotAccuracy * weights.shotAccuracy +
      norm.shotsOnTarget * weights.shotsOnTarget +
      norm.possession * weights.possession +
      norm.passAccuracy * weights.passAccuracy +
      norm.form * weights.form +
      norm.opponentStrength * weights.opponentStrength +
      norm.knockoutBonus * weights.knockoutBonus;

    return { team, composite, breakdown: norm, rawScores };
  });

  // Normalise composites to sum to 100%
  const total = scored.reduce((s, d) => s + d.composite, 0);

  const result = scored.map(({ team, composite, breakdown, rawScores }) => {
    const probability = total > 0 ? (composite / total) * 100 : 0;

    // Build human-readable explanation of top drivers
    const drivers = Object.entries(breakdown)
      .filter(([k]) => k !== 'headToHead')
      .map(([key, normVal]) => ({
        factor: key,
        normalisedScore: normVal,
        weight: weights[key] || 0,
        contribution: normVal * (weights[key] || 0),
        rawValue: rawScores[key],
      }))
      .sort((a, b) => b.contribution - a.contribution);

    return {
      ...team,
      probability: Math.round(probability * 100) / 100,
      breakdown: drivers,
    };
  });

  return result.sort((a, b) => b.probability - a.probability);
}

module.exports = { predict, computeFormScore, computeOpponentStrengthFactor };
