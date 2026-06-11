import React from 'react';
import { FACTOR_LABELS } from '../utils/prediction';

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_RINGS = ['ring-yellow-400', 'ring-gray-400', 'ring-amber-600'];
const MEDAL_BG = ['bg-yellow-400/10', 'bg-gray-400/10', 'bg-amber-600/10'];

function StatPill({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white/5 rounded-full px-2 py-0.5 text-xs text-gray-300">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </span>
  );
}

function TopCard({ team, rank }) {
  const [expanded, setExpanded] = React.useState(false);
  const top3Drivers = (team.breakdown || []).slice(0, 3);

  return (
    <div
      className={`rounded-2xl border border-white/10 p-5 flex flex-col gap-3 ${MEDAL_BG[rank]} ring-1 ${MEDAL_RINGS[rank]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl" role="img" aria-label={team.name}>
            {team.flag || '🏳️'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{MEDALS[rank]}</span>
              <h2 className="text-lg font-bold text-white">{team.name}</h2>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{team.currentStage} · {team.wins}W {team.draws}D {team.losses}L</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-white">{team.probability.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">win probability</p>
        </div>
      </div>

      {/* Probability bar */}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
          style={{ width: `${Math.min(100, team.probability * 4)}%` }}
        />
      </div>

      {/* Key stats */}
      <div className="flex flex-wrap gap-1.5">
        <StatPill label="GF" value={team.goalsFor} />
        <StatPill label="GA" value={team.goalsAgainst} />
        <StatPill label="SoT" value={team.shotsOnTarget} />
        <StatPill label="Poss" value={`${team.possession}%`} />
        <StatPill label="Pass" value={`${team.passAccuracy}%`} />
      </div>

      {/* Why this team — expandable */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="text-left text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        Why this team?
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          {top3Drivers.map(d => (
            <div key={d.factor} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-400">{FACTOR_LABELS[d.factor] || d.factor}</span>
                  <span className="text-gray-300 font-medium">
                    {(d.normalisedScore * 100).toFixed(0)}/100
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-500/70 transition-all"
                    style={{ width: `${d.normalisedScore * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-500 pt-1">
            Top contributing factors to predicted win probability.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TopPicks({ teams }) {
  const top3 = teams.slice(0, 3);
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
        Top Contenders
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((team, i) => (
          <TopCard key={team.teamId} team={team} rank={i} />
        ))}
      </div>
    </section>
  );
}
