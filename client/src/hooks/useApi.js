import { useState, useEffect, useCallback } from 'react';
import { MOCK_TEAMS, MOCK_MATCHES } from '../utils/mockData';
import { predict } from '../utils/prediction';

const DEFAULT_WEIGHTS = {
  goalsFor: 0.20, goalsAgainst: 0.18, shotAccuracy: 0.12,
  shotsOnTarget: 0.10, possession: 0.08, passAccuracy: 0.07,
  form: 0.15, opponentStrength: 0.05, knockoutBonus: 0.05,
  headToHead: 0.00, formDecayLambda: 0.35,
  knockoutMultipliers: { Group: 1.0, R32: 1.05, R16: 1.12, QF: 1.22, SF: 1.35, F: 1.50 },
};

// Use mock data if running without a backend
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;

async function apiFetch(path, options = {}) {
  const base = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export function useTeams(weights) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK) {
        // Run prediction locally on mock data
        const result = predict(MOCK_TEAMS, MOCK_MATCHES, weights || DEFAULT_WEIGHTS);
        setTeams(result);
      } else {
        const data = await apiFetch('/api/teams');
        setTeams(data);
      }
    } catch (err) {
      setError(err.message);
      // Fallback to mock on error
      const result = predict(MOCK_TEAMS, MOCK_MATCHES, weights || DEFAULT_WEIGHTS);
      setTeams(result);
    } finally {
      setLoading(false);
    }
  }, [weights]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return { teams, loading, error, refetch: fetchTeams };
}

export function useMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK) {
      setMatches([...MOCK_MATCHES].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
      return;
    }
    apiFetch('/api/matches')
      .then(data => setMatches(data))
      .catch(() => setMatches(MOCK_MATCHES))
      .finally(() => setLoading(false));
  }, []);

  return { matches, loading };
}

export function useWeights() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  useEffect(() => {
    if (USE_MOCK) return;
    apiFetch('/api/weights')
      .then(data => setWeights(data))
      .catch(() => {});
  }, []);

  const saveWeights = useCallback(async (newWeights, adminPassword) => {
    if (USE_MOCK) {
      setWeights(newWeights);
      return { success: true };
    }
    const data = await apiFetch('/api/weights', {
      method: 'PUT',
      body: JSON.stringify(newWeights),
      headers: { 'x-admin-password': adminPassword },
    });
    setWeights(data.weights);
    return data;
  }, []);

  return { weights, setWeights, saveWeights };
}

export function useSyncLog() {
  const [log, setLog] = useState([]);

  useEffect(() => {
    if (USE_MOCK) return;
    apiFetch('/api/sync').then(setLog).catch(() => {});
  }, []);

  const triggerSync = useCallback(async (adminPassword) => {
    const data = await apiFetch('/api/sync', {
      method: 'POST',
      headers: { 'x-admin-password': adminPassword },
    });
    setLog(prev => [data, ...prev]);
    return data;
  }, []);

  return { log, triggerSync };
}

export { apiFetch, DEFAULT_WEIGHTS };
