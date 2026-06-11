import React, { useState, useEffect } from 'react';
import TopPicks from './components/TopPicks';
import Leaderboard from './components/Leaderboard';
import MatchFeed from './components/MatchFeed';
import ProbabilityChart from './components/ProbabilityChart';
import AdminPage from './pages/AdminPage';
import { useTeams, useMatches, useWeights } from './hooks/useApi';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'matches', label: 'Matches' },
  { id: 'chart', label: 'History' },
  { id: 'admin', label: 'Admin' },
];

function Header({ activeTab, setActiveTab, onRefresh, refreshing, lastRefresh }) {
  return (
    <header className="border-b border-white/10 sticky top-0 z-20 bg-gray-950/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h1 className="text-sm font-black text-white leading-none">WC2026 Predictor</h1>
            {lastRefresh && (
              <p className="text-xs text-gray-600">
                Updated {new Date(lastRefresh).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <nav className="flex gap-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveTab(n.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === n.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          title="Recalculate predictions"
          className="text-gray-500 hover:text-white disabled:opacity-40 transition-colors text-sm"
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const { weights } = useWeights();
  const { teams, loading: teamsLoading, refetch } = useTeams(weights);
  const { matches, loading: matchesLoading } = useMatches();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setLastRefresh(new Date().toISOString());
    setRefreshing(false);
  };

  useEffect(() => {
    setLastRefresh(new Date().toISOString());
  }, []);

  const loading = teamsLoading || matchesLoading;

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        lastRefresh={lastRefresh}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <span className="animate-spin text-2xl">⚽</span>
            <span className="text-gray-500">Loading predictions…</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-10">
                <div className="text-center py-6">
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">FIFA World Cup 2026</p>
                  <h1 className="text-4xl md:text-5xl font-black text-white">
                    Who Will Win?
                  </h1>
                  <p className="text-gray-500 mt-2 text-sm max-w-xl mx-auto">
                    Statistical model updating live as match data flows in. Powered by goals, shots, possession, form, and stage progression.
                  </p>
                </div>
                {teams.length > 0 ? (
                  <>
                    <TopPicks teams={teams} />
                    <Leaderboard teams={teams} />
                  </>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <p className="text-4xl mb-4">⚽</p>
                    <p>No team data yet. Configure your API key and run a sync, or add teams manually in Admin.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'matches' && (
              <MatchFeed matches={matches} />
            )}

            {activeTab === 'chart' && (
              <ProbabilityChart teams={teams} />
            )}

            {activeTab === 'admin' && (
              <AdminPage />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/5 mt-16 py-6 text-center text-xs text-gray-700">
        World Cup 2026 Winner Predictor · Statistical model, not a betting product
      </footer>
    </div>
  );
}
