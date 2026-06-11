import React, { useState } from 'react';
import { FACTOR_LABELS } from '../utils/prediction';

const STAGE_COLORS = {
  Group: 'text-gray-400 bg-gray-400/10',
  R32: 'text-blue-400 bg-blue-400/10',
  R16: 'text-purple-400 bg-purple-400/10',
  QF: 'text-yellow-400 bg-yellow-400/10',
  SF: 'text-orange-400 bg-orange-400/10',
  F: 'text-emerald-400 bg-emerald-400/10',
};

function BreakdownRow({ driver }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-36 text-xs text-gray-400 shrink-0">
        {FACTOR_LABELS[driver.factor] || driver.factor}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-teal-500/70"
          style={{ width: `${driver.normalisedScore * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">
        {(driver.normalisedScore * 100).toFixed(0)}
      </span>
    </div>
  );
}

function LeaderboardRow({ team, rank, maxProb }) {
  const [expanded, setExpanded] = useState(false);
  const barWidth = maxProb > 0 ? (team.probability / maxProb) * 100 : 0;

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="py-3 pl-4 pr-2 text-gray-500 text-sm w-8">{rank}</td>
        <td className="py-3 px-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{team.flag || '🏳️'}</span>
            <div>
              <p className="font-semibold text-white text-sm">{team.name}</p>
              <p className="text-xs text-gray-500">{team.wins}W {team.draws}D {team.losses}L</p>
            </div>
          </div>
        </td>
        <td className="py-3 px-2 hidden sm:table-cell">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[team.currentStage] || 'text-gray-400'}`}>
            {team.currentStage}
          </span>
        </td>
        <td className="py-3 px-2 hidden md:table-cell text-sm text-gray-300">
          {team.goalsFor}<span className="text-gray-600">–</span>{team.goalsAgainst}
        </td>
        <td className="py-3 px-2 hidden lg:table-cell text-sm text-gray-300">
          {team.possession}%
        </td>
        <td className="py-3 px-2 w-48">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-400 transition-all duration-700"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white w-12 text-right">
              {team.probability.toFixed(1)}%
            </span>
          </div>
        </td>
        <td className="py-3 pr-4 pl-2 text-gray-600 text-xs">
          {expanded ? '▾' : '▸'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white/[0.015] border-b border-white/5">
          <td colSpan={7} className="px-6 py-4">
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Factor Breakdown</p>
            {(team.breakdown || []).map(d => (
              <BreakdownRow key={d.factor} driver={d} />
            ))}
          </td>
        </tr>
      )}
    </>
  );
}

export default function Leaderboard({ teams }) {
  const maxProb = teams[0]?.probability || 1;

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
        All Teams — Ranked by Win Probability
      </h2>
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="py-2 pl-4 pr-2 text-left text-xs text-gray-600 font-medium">#</th>
              <th className="py-2 px-2 text-left text-xs text-gray-600 font-medium">Team</th>
              <th className="py-2 px-2 text-left text-xs text-gray-600 font-medium hidden sm:table-cell">Stage</th>
              <th className="py-2 px-2 text-left text-xs text-gray-600 font-medium hidden md:table-cell">GF–GA</th>
              <th className="py-2 px-2 text-left text-xs text-gray-600 font-medium hidden lg:table-cell">Poss</th>
              <th className="py-2 px-2 text-left text-xs text-gray-600 font-medium">Probability</th>
              <th className="py-2 pr-4 pl-2" />
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <LeaderboardRow
                key={team.teamId}
                team={team}
                rank={i + 1}
                maxProb={maxProb}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
