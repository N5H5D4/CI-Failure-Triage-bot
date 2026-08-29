import React from 'react';
import {
  Sparkles,
  GitPullRequest,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { TriageResult, DashboardMetrics } from '../types';
import MetricsBar from '../components/MetricsBar';
import DataTable from '../components/DataTable';

interface DashboardProps {
  runs: TriageResult[];
  metrics: DashboardMetrics;
  onSelectRun: (run: TriageResult) => void;
  onOpenSimulator: () => void;
  isLoading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  runs,
  metrics,
  onSelectRun,
  onOpenSimulator,
  isLoading = false,
}) => {
  // Category breakdown calculation
  const categoryCounts: Record<string, number> = {};
  runs.forEach((run) => {
    const cat = run.failure_category || 'other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Hero / Pipeline Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/40 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Clean Architecture AI Engine</span>
              </span>
              <span className="text-xs text-zinc-500">v1.4.0 Production</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 font-sans">
              CI/CD Failure Diagnostic & Root-Cause Triage
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Real-time webhook ingestion parses failed GitHub Actions runs, trims error noise, validates diagnostic schemas via Claude 3.5 Sonnet, and automatically posts markdown root-cause analyses on pull requests.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              id="dashboard-simulate-banner-btn"
              onClick={onOpenSimulator}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 transition-all focus:ring-2 focus:ring-indigo-500"
            >
              <span>Simulate Webhook Trigger</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <MetricsBar
        metrics={metrics}
        totalTriaged={runs.length}
        avgConfidence={runs.length > 0 ? 95 : 0}
      />

      {/* Categories Distribution Strip */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-xs font-medium text-zinc-400">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Failure Distribution (Live):</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <span className="font-semibold">Dependency:</span>
            <span className="font-mono">{categoryCounts['dependency_issue'] || 0}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
            <span className="font-semibold">Syntax/Build:</span>
            <span className="font-mono">{categoryCounts['syntax_error'] || 0}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <span className="font-semibold">Test Failure:</span>
            <span className="font-mono">{categoryCounts['test_failure'] || 0}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300">
            <span className="font-semibold">Flaky Test:</span>
            <span className="font-mono">{categoryCounts['flaky_test'] || 0}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
            <span className="font-semibold">Infra / Timeout:</span>
            <span className="font-mono">{categoryCounts['infrastructure_timeout'] || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Runs Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center space-x-2">
            <span>Recent Triaged Workflow Runs</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400">
              {runs.length}
            </span>
          </h2>
          <span className="text-xs text-zinc-500">
            Click any row to view diagnostic stack trace and suggested fix
          </span>
        </div>

        <DataTable
          runs={runs}
          onSelectRun={onSelectRun}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
