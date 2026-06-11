import React, { useState } from 'react';
import { useWeights, useSyncLog, apiFetch, DEFAULT_WEIGHTS } from '../hooks/useApi';
import { FACTOR_LABELS } from '../utils/prediction';

const WEIGHT_KEYS = [
  'goalsFor', 'goalsAgainst', 'shotAccuracy', 'shotsOnTarget',
  'possession', 'passAccuracy', 'form', 'opponentStrength', 'knockoutBonus',
];

function WeightSlider({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 w-36 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={0.5}
        step={0.01}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-emerald-500"
      />
      <span className="text-sm font-mono text-white w-12 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

function ManualMatchForm({ onSaved }) {
  const [form, setForm] = useState({
    homeTeamName: '', awayTeamName: '',
    homeTeamId: '', awayTeamId: '',
    homeScore: '', awayScore: '',
    stage: 'Group', date: new Date().toISOString().slice(0, 16),
  });
  const [adminPwd, setAdminPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await apiFetch('/api/matches', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          homeScore: parseInt(form.homeScore, 10),
          awayScore: parseInt(form.awayScore, 10),
          date: new Date(form.date).toISOString(),
          status: 'FINISHED',
        }),
        headers: { 'x-admin-password': adminPwd },
      });
      setMsg('Match saved successfully.');
      onSaved?.();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const field = (key, placeholder, type = 'text') => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 w-full"
      required
    />
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {field('homeTeamId', 'Home Team ID')}
        {field('awayTeamId', 'Away Team ID')}
        {field('homeTeamName', 'Home Team Name')}
        {field('awayTeamName', 'Away Team Name')}
        {field('homeScore', 'Home Score', 'number')}
        {field('awayScore', 'Away Score', 'number')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.stage}
          onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
        >
          {['Group','R32','R16','QF','SF','F'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="datetime-local"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
        />
      </div>
      <input
        type="password"
        placeholder="Admin password"
        value={adminPwd}
        onChange={e => setAdminPwd(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 w-full"
        required
      />
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors"
      >
        {saving ? 'Saving…' : 'Save Match'}
      </button>
      {msg && <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</p>}
    </form>
  );
}

export default function AdminPage() {
  const { weights, setWeights, saveWeights } = useWeights();
  const { log, triggerSync } = useSyncLog();
  const [adminPwd, setAdminPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('weights');

  const handleSaveWeights = async () => {
    setSaving(true);
    setMsg('');
    try {
      await saveWeights(weights, adminPwd);
      setMsg('Weights saved.');
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!adminPwd) { setMsg('Enter admin password first'); return; }
    setSyncing(true);
    setMsg('');
    try {
      const result = await triggerSync(adminPwd);
      setMsg(`Sync ${result.status}: ${result.teamsCount ?? 0} teams, ${result.matchesCount ?? 0} matches`);
    } catch (err) {
      setMsg(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const totalWeight = WEIGHT_KEYS.reduce((s, k) => s + (weights[k] || 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">Manage model weights, sync data, and enter manual results.</p>
      </div>

      {/* Admin password */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Admin Password</label>
        <input
          type="password"
          placeholder="Enter password to unlock admin actions"
          value={adminPwd}
          onChange={e => setAdminPwd(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 w-full"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['weights', 'manual', 'sync'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'weights' ? 'Model Weights' : t === 'manual' ? 'Manual Match' : 'Sync Log'}
          </button>
        ))}
      </div>

      {msg && (
        <p className={`text-sm px-3 py-2 rounded-lg ${msg.startsWith('Error') || msg.startsWith('Sync error') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {msg}
        </p>
      )}

      {tab === 'weights' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Model Weights</h2>
            <span className={`text-xs ${Math.abs(totalWeight - 1) > 0.02 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              Total: {totalWeight.toFixed(2)} {Math.abs(totalWeight - 1) > 0.02 ? '⚠ should sum to 1.0' : '✓'}
            </span>
          </div>
          <div className="space-y-3">
            {WEIGHT_KEYS.map(key => (
              <WeightSlider
                key={key}
                label={FACTOR_LABELS[key] || key}
                value={weights[key] || 0}
                onChange={val => setWeights(w => ({ ...w, [key]: val }))}
              />
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveWeights}
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg py-2 text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save Weights'}
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Decay lambda: {weights.formDecayLambda} (higher = older games matter less)
          </p>
        </div>
      )}

      {tab === 'manual' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Enter Match Result Manually</h2>
          <ManualMatchForm />
        </div>
      )}

      {tab === 'sync' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Data Sync</h2>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
            >
              {syncing ? 'Syncing…' : '↻ Sync Now'}
            </button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {log.length === 0 && (
              <p className="text-gray-500 text-sm">No sync history yet.</p>
            )}
            {log.map((entry, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-white/5 text-xs">
                <span className="text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                <span className={`font-medium ${entry.status === 'success' ? 'text-emerald-400' : entry.status === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {entry.status}
                </span>
                <span className="text-gray-600 flex-1 text-right">
                  {entry.error || `${entry.teamsCount ?? '-'} teams · ${entry.matchesCount ?? '-'} matches`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
