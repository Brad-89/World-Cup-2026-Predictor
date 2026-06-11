/**
 * Data Fetcher — pulls live match data from football-data.org
 * Falls back gracefully to cached JSON if the API is unavailable.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../data');

// World Cup 2026 competition ID on football-data.org (update once tournament starts)
const WC2026_ID = 2000; // placeholder — actual ID assigned by football-data.org

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

/**
 * Simple promisified HTTPS GET with JSON parsing.
 */
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY, ...headers },
    };
    https
      .get(url, options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Map a football-data.org team object to our internal team profile shape.
 */
function mapTeam(apiTeam) {
  return {
    teamId: String(apiTeam.id),
    name: apiTeam.name || apiTeam.shortName,
    shortName: apiTeam.shortName || apiTeam.tla,
    crestUrl: apiTeam.crest || '',
    flag: apiTeam.tla || '',
    gamesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    shotsOnTarget: 0,
    shotsTotal: 0,
    possession: 50,
    passAccuracy: 75,
    currentStage: 'Group',
    probabilityHistory: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Map a football-data.org match object to our internal match shape.
 */
function mapMatch(apiMatch) {
  const score = apiMatch.score?.fullTime || { home: null, away: null };
  return {
    matchId: String(apiMatch.id),
    date: apiMatch.utcDate,
    status: apiMatch.status, // FINISHED / SCHEDULED / IN_PLAY etc.
    stage: apiMatch.stage,
    homeTeamId: String(apiMatch.homeTeam?.id),
    homeTeamName: apiMatch.homeTeam?.name,
    awayTeamId: String(apiMatch.awayTeam?.id),
    awayTeamName: apiMatch.awayTeam?.name,
    homeScore: score.home,
    awayScore: score.away,
    stats: {}, // populated separately if endpoint available
  };
}

/**
 * Fetch all teams participating in the tournament.
 */
async function fetchTeams() {
  const url = `https://api.football-data.org/v4/competitions/${WC2026_ID}/teams`;
  const data = await httpsGet(url);
  return (data.teams || []).map(mapTeam);
}

/**
 * Fetch all matches for the tournament.
 */
async function fetchMatches() {
  const url = `https://api.football-data.org/v4/competitions/${WC2026_ID}/matches`;
  const data = await httpsGet(url);
  return (data.matches || []).map(mapMatch);
}

/**
 * Rebuild team stat profiles from the full match list.
 * Aggregates goals, game counts, stage progression.
 * Shot/possession stats come from individual match stats (if provided).
 */
function rebuildTeamStats(teams, matches) {
  const statsMap = {};

  teams.forEach(t => {
    statsMap[t.teamId] = {
      ...t,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      shotsOnTarget: 0,
      shotsTotal: 0,
      possession: 0,
      passAccuracy: 0,
      _possessionSamples: 0,
      _passAccSamples: 0,
    };
  });

  const stageOrder = ['Group', 'R32', 'R16', 'QF', 'SF', 'F'];

  matches
    .filter(m => m.status === 'FINISHED')
    .forEach(match => {
      [
        { id: match.homeTeamId, gf: match.homeScore, ga: match.awayScore, isHome: true },
        { id: match.awayTeamId, gf: match.awayScore, ga: match.homeScore, isHome: false },
      ].forEach(({ id, gf, ga, isHome }) => {
        const t = statsMap[id];
        if (!t) return;

        t.gamesPlayed += 1;
        t.goalsFor += gf ?? 0;
        t.goalsAgainst += ga ?? 0;

        if (gf > ga) t.wins += 1;
        else if (gf === ga) t.draws += 1;
        else t.losses += 1;

        // Accumulate shot/possession stats from match.stats if present
        const s = match.stats || {};
        if (s.shotsOnTarget) {
          t.shotsOnTarget += isHome
            ? s.shotsOnTarget.home || 0
            : s.shotsOnTarget.away || 0;
        }
        if (s.shotsTotal) {
          t.shotsTotal += isHome
            ? s.shotsTotal.home || 0
            : s.shotsTotal.away || 0;
        }
        if (s.possession) {
          t.possession += isHome
            ? s.possession.home || 50
            : s.possession.away || 50;
          t._possessionSamples += 1;
        }
        if (s.passAccuracy) {
          t.passAccuracy += isHome
            ? s.passAccuracy.home || 75
            : s.passAccuracy.away || 75;
          t._passAccSamples += 1;
        }

        // Update stage to furthest reached
        const matchStage = normaliseStage(match.stage);
        if (
          matchStage &&
          stageOrder.indexOf(matchStage) > stageOrder.indexOf(t.currentStage)
        ) {
          t.currentStage = matchStage;
        }
      });
    });

  // Finalise averages
  return Object.values(statsMap).map(t => {
    const result = { ...t };
    if (t._possessionSamples > 0) result.possession = t.possession / t._possessionSamples;
    if (t._passAccSamples > 0) result.passAccuracy = t.passAccuracy / t._passAccSamples;
    delete result._possessionSamples;
    delete result._passAccSamples;
    result.lastUpdated = new Date().toISOString();
    return result;
  });
}

function normaliseStage(apiStage) {
  if (!apiStage) return null;
  const s = apiStage.toUpperCase();
  if (s.includes('GROUP')) return 'Group';
  if (s.includes('32') || s.includes('LAST_32')) return 'R32';
  if (s.includes('16') || s.includes('LAST_16')) return 'R16';
  if (s.includes('QUARTER')) return 'QF';
  if (s.includes('SEMI')) return 'SF';
  if (s.includes('FINAL')) return 'F';
  return null;
}

/**
 * Main sync function — fetches from API, updates JSON files, logs timestamp.
 * Returns { teams, matches, error? }
 */
async function syncData() {
  const log = readJSON('syncLog.json') || [];
  const entry = { timestamp: new Date().toISOString(), status: 'started' };

  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not set');

    const [apiTeams, apiMatches] = await Promise.all([
      fetchTeams(),
      fetchMatches(),
    ]);

    // Merge with existing teams to preserve probabilityHistory
    const existing = readJSON('teams.json') || [];
    const existingMap = Object.fromEntries(existing.map(t => [t.teamId, t]));

    const mergedTeams = apiTeams.map(t => ({
      ...(existingMap[t.teamId] || {}),
      ...t,
      probabilityHistory: existingMap[t.teamId]?.probabilityHistory || [],
    }));

    const rebuiltTeams = rebuildTeamStats(mergedTeams, apiMatches);

    writeJSON('teams.json', rebuiltTeams);
    writeJSON('matches.json', apiMatches);

    entry.status = 'success';
    entry.teamsCount = rebuiltTeams.length;
    entry.matchesCount = apiMatches.length;
  } catch (err) {
    entry.status = 'error';
    entry.error = err.message;
    console.error('[syncData] Error:', err.message);
  }

  log.unshift(entry);
  writeJSON('syncLog.json', log.slice(0, 100)); // keep last 100 entries

  return entry;
}

module.exports = { syncData, rebuildTeamStats, normaliseStage, readJSON, writeJSON };
