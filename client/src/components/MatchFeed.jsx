import React from 'react';

const STAGE_LABEL = {
  Group: 'Group Stage', R32: 'Round of 32', R16: 'Round of 16',
  QF: 'Quarter-final', SF: 'Semi-final', F: 'Final',
};

function MatchCard({ match }) {
  const isFinished = match.status === 'FINISHED';
  const date = new Date(match.date);
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
      isFinished ? 'border-white/10 bg-white/[0.02]' : 'border-blue-500/20 bg-blue-500/5'
    }`}>
      <div className="text-center w-14 shrink-0">
        <p className="text-xs text-gray-500">{dateStr}</p>
        <p className="text-xs text-gray-600">{isFinished ? 'FT' : timeStr}</p>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${
          isFinished ? 'bg-gray-700 text-gray-300' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {STAGE_LABEL[match.stage] || match.stage || ''}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-medium text-sm text-white text-right">{match.homeTeamName}</span>
        </div>

        <div className="shrink-0 text-center w-20">
          {isFinished ? (
            <span className="text-xl font-black text-white">
              {match.homeScore} <span className="text-gray-600">–</span> {match.awayScore}
            </span>
          ) : (
            <span className="text-sm text-gray-500">vs</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium text-sm text-white">{match.awayTeamName}</span>
        </div>
      </div>

      {isFinished && match.stats?.possession && (
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-xs text-gray-600">Possession</p>
          <p className="text-xs text-gray-400">
            {match.stats.possession.home}% – {match.stats.possession.away}%
          </p>
        </div>
      )}
    </div>
  );
}

export default function MatchFeed({ matches }) {
  const finished = matches.filter(m => m.status === 'FINISHED');
  const upcoming = matches.filter(m => m.status !== 'FINISHED');

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
        Match Results
      </h2>
      <div className="space-y-2">
        {upcoming.length > 0 && (
          <>
            <p className="text-xs text-blue-400 font-medium uppercase tracking-wide px-1 pt-1">Upcoming</p>
            {upcoming.map(m => <MatchCard key={m.matchId} match={m} />)}
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide px-1 pt-3">Completed</p>
          </>
        )}
        {finished.map(m => <MatchCard key={m.matchId} match={m} />)}
        {finished.length === 0 && upcoming.length === 0 && (
          <p className="text-gray-500 text-sm py-4 text-center">No matches yet</p>
        )}
      </div>
    </section>
  );
}
