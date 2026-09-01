import React from 'react';
import {
  Sparkles,
  Layers,
  FlaskConical,
  Trash2,
} from 'lucide-react';
import { TriageResult, DashboardMetrics } from '../types';
import MetricsBar from '../components/MetricsBar';
import DataTable, { isSimulatedRun } from '../components/DataTable';
import { theme } from '../styles/theme';

interface DashboardProps {
  runs: TriageResult[];
  metrics: DashboardMetrics;
  onSelectRun: (run: TriageResult) => void;
  onDeleteRun?: (run: TriageResult) => void;
  onClearSimulated?: () => void;
  onOpenSimulator?: () => void;
  isLoading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  runs,
  metrics,
  onSelectRun,
  onDeleteRun,
  onClearSimulated,
  onOpenSimulator,
  isLoading = false,
}) => {
  // Category breakdown calculation
  const categoryCounts: Record<string, number> = {};
  runs.forEach((run) => {
    const cat = run.failure_category || 'other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const simulatedCount = runs.filter(isSimulatedRun).length;

  return (
    <div className="space-y-6">
      {/* Hero / Pipeline Banner */}
      <div className={theme.cards.hero}>
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Clean Architecture AI Engine</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
            CI/CD Failure Root-Cause Analysis
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Ingest real-time GitHub Actions webhook failures, intelligently reduce noise and trim logs, diagnose core root causes via AI, and automatically post Markdown triage comments to Pull Requests.
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <MetricsBar
        metrics={metrics}
        totalTriaged={runs.length}
        avgConfidence={runs.length > 0 ? 95 : 0}
      />

      {/* Categories Distribution Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Failure Breakdown (Live):</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800">
            <span className="font-semibold">Dependency:</span>
            <span className="font-mono font-bold">{categoryCounts['dependency_issue'] || 0}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
            <span className="font-semibold">Syntax / Build:</span>
            <span className="font-mono font-bold">{categoryCounts['syntax_error'] || 0}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
            <span className="font-semibold">Test Failure:</span>
            <span className="font-mono font-bold">{categoryCounts['test_failure'] || 0}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-900">
            <span className="font-semibold">Flaky Test:</span>
            <span className="font-mono font-bold">{categoryCounts['flaky_test'] || 0}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
            <span className="font-semibold">Infra / Timeout:</span>
            <span className="font-mono font-bold">{categoryCounts['infrastructure_timeout'] || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Runs Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>Recent CI Failure Triage History</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {runs.length}
              </span>
            </h2>

            {simulatedCount > 0 && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <FlaskConical className="w-3 h-3 text-purple-600" />
                <span>{simulatedCount} Simulated</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {simulatedCount > 0 && onClearSimulated && (
              <button
                id="clear-simulated-runs-btn"
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove all ${simulatedCount} simulated test records from triage.db?`
                    )
                  ) {
                    onClearSimulated();
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer font-medium"
              >
                <Trash2 className="w-3 h-3 text-purple-600" />
                <span>Clear Simulated Runs ({simulatedCount})</span>
              </button>
            )}

            <span className="text-slate-500 hidden md:inline">
              Click any row to inspect logs & remediation
            </span>
          </div>
        </div>

        <DataTable
          runs={runs}
          onSelectRun={onSelectRun}
          onDeleteRun={onDeleteRun}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
