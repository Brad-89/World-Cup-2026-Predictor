import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const PALETTE = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

function buildChartData(teams) {
  // Collect all unique timestamps
  const allTimestamps = new Set();
  teams.forEach(t =>
    (t.probabilityHistory || []).forEach(h => allTimestamps.add(h.timestamp))
  );
  const sorted = [...allTimestamps].sort();

  return sorted.map(ts => {
    const point = {
      label: new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
    teams.forEach(t => {
      const entry = (t.probabilityHistory || []).find(h => h.timestamp === ts);
      if (entry) point[t.name] = entry.probability;
    });
    return point;
  });
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {[...payload]
        .sort((a, b) => b.value - a.value)
        .map(p => (
          <p key={p.name} className="text-xs" style={{ color: p.color }}>
            {p.name}: <span className="font-bold">{p.value?.toFixed(1)}%</span>
          </p>
        ))}
    </div>
  );
};

export default function ProbabilityChart({ teams }) {
  const teamsWithHistory = teams.filter(t => t.probabilityHistory?.length > 1);
  const [selected, setSelected] = useState(new Set(teamsWithHistory.slice(0, 5).map(t => t.name)));

  if (teamsWithHistory.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Probability History
        </h2>
        <div className="rounded-2xl border border-white/10 p-8 text-center text-gray-500 text-sm">
          No probability history yet — history builds as data syncs over the tournament.
        </div>
      </section>
    );
  }

  const data = buildChartData(teamsWithHistory);

  const toggleTeam = name => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">
        Win Probability Over Tournament
      </h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        {/* Team toggle pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {teamsWithHistory.map((team, i) => {
            const color = PALETTE[i % PALETTE.length];
            const active = selected.has(team.name);
            return (
              <button
                key={team.teamId}
                onClick={() => toggleTeam(team.name)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active ? 'border-transparent text-white' : 'border-white/10 text-gray-500 bg-transparent'
                }`}
                style={active ? { backgroundColor: color + '30', borderColor: color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: active ? color : '#4b5563' }}
                />
                {team.flag} {team.name}
              </button>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            {teamsWithHistory.map((team, i) =>
              selected.has(team.name) ? (
                <Line
                  key={team.teamId}
                  type="monotone"
                  dataKey={team.name}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: PALETTE[i % PALETTE.length] }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
