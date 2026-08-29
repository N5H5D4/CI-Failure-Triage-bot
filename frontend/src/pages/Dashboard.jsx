// frontend/src/pages/Dashboard.jsx
import React, { useState } from 'react';
import { RefreshCw, PlusCircle, Sparkles } from 'lucide-react';
import MetricsBar from '../components/MetricsBar';
import DataTable from '../components/DataTable';

export default function Dashboard({
  runs,
  metrics,
  loading,
  onRefresh,
  onSelectRun,
  onNavigate,
  onQuickSimulate
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'dependency_issue', label: 'Dependency Issue' },
    { id: 'syntax_error', label: 'Syntax Error' },
    { id: 'test_failure', label: 'Test Failure' },
    { id: 'flaky_test', label: 'Flaky Test' },
    { id: 'configuration_error', label: 'Config Error' },
    { id: 'infrastructure_timeout', label: 'Timeout' },
  ];

  const filteredRuns = runs.filter((run) => {
    if (selectedCategory === 'all') return true;
    return run.failure_category === selectedCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-zinc-800 mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">CI Failure Triage Dashboard</h1>
            <span className="flex items-center space-x-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live 5s Polling</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Real-time automated incident triaging for GitHub Actions continuous integration pipelines.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onQuickSimulate('dependency_issue')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Simulate CI Failure</span>
          </button>

          <button
            onClick={() => onNavigate('connect')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Connect Repo</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <MetricsBar metrics={metrics} totalCount={runs.length} />

      {/* Controls & Table Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-base font-semibold text-zinc-100">Recent Triaged Failures</h2>
          <span className="text-xs font-mono font-semibold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
            {filteredRuns.length} recorded
          </span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Category Filter Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-48 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-medium text-zinc-200 shadow-sm focus:outline-none focus:border-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1 px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable runs={filteredRuns} loading={loading} onSelectRun={onSelectRun} />
    </div>
  );
}
