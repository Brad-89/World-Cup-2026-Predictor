/**
 * Client-side prediction engine mirror.
 * Runs the same algorithm as the server so the UI can show live previews
 * when adjusting weights without a round-trip.
 */

export function computeFormScore(team, matches, lambda) {
  const teamMatches = matches
    .filter(
      m =>
        m.status === 'FINISHED' &&
        (m.homeTeamId === team.teamId || m.awayTeamId === team.teamId)
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (teamMatches.length === 0) return 0.5;

  let weightedScore = 0;
  let totalWeight = 0;

  teamMatches.forEach((match, index) => {
    const weight = Math.exp(-lambda * index);
    const isHome = match.homeTeamId === team.teamId;
    const teamScore = isHome ? match.homeScore : match.awayScore;
    const oppScore = isHome ? match.awayScore : match.homeScore;
    let result = teamScore > oppScore ? 1.0 : teamScore === oppScore ? 0.5 : 0.0;
    weightedScore += result * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedScore / totalWeight : 0.5;
}

function normalise(value, min, max) {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function predict(teams, matches, weights) {
  if (!teams || teams.length === 0) return [];

  const stageRank = { Group: 1, R32: 2, R16: 3, QF: 4, SF: 5, F: 6 };

  const rawData = teams.map(team => {
    const gamesPlayed = team.gamesPlayed || 1;
    const goalsForPerGame = team.goalsFor / gamesPlayed;
    const goalsAgainstPerGame = team.goalsAgainst / gamesPlayed;
    const shotAccuracy = team.shotsTotal > 0 ? team.shotsOnTarget / team.shotsTotal : 0;
    const shotsOnTargetPerGame = team.shotsOnTarget / gamesPlayed;
    const possession = team.possession / 100;
    const passAccuracy = team.passAccuracy / 100;
    const form = computeFormScore(team, matches, weights.formDecayLambda);

    // Opponent strength
    const teamMatches = matches.filter(
      m => m.status === 'FINISHED' &&
        (m.homeTeamId === team.teamId || m.awayTeamId === team.teamId)
    );
    let avgOppStrength = 2;
    if (teamMatches.length > 0) {
      const total = teamMatches.reduce((sum, m) => {
        const oppId = m.homeTeamId === team.teamId ? m.awayTeamId : m.homeTeamId;
        const opp = teams.find(t => t.teamId === oppId);
        return sum + (stageRank[opp?.currentStage] || 1);
      }, 0);
      avgOppStrength = total / teamMatches.length;
    }
    const opponentStrength = Math.min(1.2, Math.max(0.8, 0.9 + avgOppStrength * 0.05));
    const kBonus = weights.knockoutMultipliers?.[team.currentStage] || 1.0;

    return {
      team,
      rawScores: {
        goalsFor: goalsForPerGame,
        goalsAgainst: goalsAgainstPerGame,
        shotAccuracy,
        shotsOnTarget: shotsOnTargetPerGame,
        possession,
        passAccuracy,
        form,
        opponentStrength,
        knockoutBonus: kBonus,
      },
    };
  });

  const dims = ['goalsFor','goalsAgainst','shotAccuracy','shotsOnTarget','possession','passAccuracy','form','opponentStrength','knockoutBonus'];
  const ranges = {};
  dims.forEach(dim => {
    const vals = rawData.map(d => d.rawScores[dim]);
    ranges[dim] = { min: Math.min(...vals), max: Math.max(...vals) };
  });

  const scored = rawData.map(({ team, rawScores }) => {
    const norm = {};
    norm.goalsFor = normalise(rawScores.goalsFor, ranges.goalsFor.min, ranges.goalsFor.max);
    norm.goalsAgainst = 1 - normalise(rawScores.goalsAgainst, ranges.goalsAgainst.min, ranges.goalsAgainst.max);
    norm.shotAccuracy = normalise(rawScores.shotAccuracy, ranges.shotAccuracy.min, ranges.shotAccuracy.max);
    norm.shotsOnTarget = normalise(rawScores.shotsOnTarget, ranges.shotsOnTarget.min, ranges.shotsOnTarget.max);
    norm.possession = normalise(rawScores.possession, ranges.possession.min, ranges.possession.max);
    norm.passAccuracy = normalise(rawScores.passAccuracy, ranges.passAccuracy.min, ranges.passAccuracy.max);
    norm.form = normalise(rawScores.form, ranges.form.min, ranges.form.max);
    norm.opponentStrength = normalise(rawScores.opponentStrength, ranges.opponentStrength.min, ranges.opponentStrength.max);
    norm.knockoutBonus = normalise(rawScores.knockoutBonus, ranges.knockoutBonus.min, ranges.knockoutBonus.max);

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

    const drivers = Object.entries(norm).map(([key, normVal]) => ({
      factor: key,
      normalisedScore: normVal,
      weight: weights[key] || 0,
      contribution: normVal * (weights[key] || 0),
      rawValue: rawScores[key],
    })).sort((a, b) => b.contribution - a.contribution);

    return { team, composite, breakdown: drivers, rawScores };
  });

  const total = scored.reduce((s, d) => s + d.composite, 0);
  return scored
    .map(({ team, composite, breakdown }) => ({
      ...team,
      probability: total > 0 ? Math.round((composite / total) * 10000) / 100 : 0,
      breakdown,
    }))
    .sort((a, b) => b.probability - a.probability);
}

export const FACTOR_LABELS = {
  goalsFor: 'Goals Scored',
  goalsAgainst: 'Goals Conceded',
  shotAccuracy: 'Shot Accuracy',
  shotsOnTarget: 'Shots on Target',
  possession: 'Possession',
  passAccuracy: 'Pass Accuracy',
  form: 'Recent Form',
  opponentStrength: 'Opponent Strength',
  knockoutBonus: 'Stage Reached',
};
