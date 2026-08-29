import React, { useState } from 'react';
import {
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  GitPullRequest,
  Terminal,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { TriageResult } from '../types';
import CategoryBadge from './CategoryBadge';

interface DataTableProps {
  runs: TriageResult[];
  onSelectRun: (run: TriageResult) => void;
  isLoading?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  runs,
  onSelectRun,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      run.repo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.run_id.toString().includes(searchTerm) ||
      (run.root_cause &&
        run.root_cause.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'ALL' ||
      run.failure_category.toLowerCase() === categoryFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'ALL' || run.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = [
    { value: 'ALL', label: 'All Categories' },
    { value: 'syntax_error', label: 'Syntax Error' },
    { value: 'test_failure', label: 'Test Failure' },
    { value: 'dependency_issue', label: 'Dependency Issue' },
    { value: 'flaky_test', label: 'Flaky Test' },
    { value: 'infrastructure_timeout', label: 'Infra Timeout' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Controls Bar */}
      <div className="p-4 border-b border-zinc-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-zinc-900/60">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            id="search-runs-input"
            type="text"
            placeholder="Search repository, Run ID, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto">
          {/* Category dropdown */}
          <div className="flex items-center space-x-1 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              id="filter-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status dropdown */}
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="posted">Posted to PR</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Run / Job ID</th>
              <th className="py-3 px-4">Repository</th>
              <th className="py-3 px-4">Context</th>
              <th className="py-3 px-4">Diagnosis Category</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Bot Action</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading triage analysis streams...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-zinc-600" />
                    <span className="text-zinc-400 font-medium">
                      No CI triage records found
                    </span>
                    <span className="text-zinc-500 text-xs">
                      Try adjusting your search criteria or trigger a test webhook run.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRuns.map((run) => {
                const confidencePercent = Math.round(
                  (run.confidence_score || 0.9) * 100
                );
                return (
                  <tr
                    key={run.id || run.run_id}
                    id={`run-row-${run.run_id}`}
                    onClick={() => onSelectRun(run)}
                    className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Run ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-zinc-200">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                        <span>#{run.run_id}</span>
                      </div>
                    </td>

                    {/* Repo Name */}
                    <td className="py-3.5 px-4 font-medium text-zinc-200">
                      <span className="text-indigo-300 hover:underline">
                        {run.repo_name}
                      </span>
                    </td>

                    {/* PR # */}
                    <td className="py-3.5 px-4 text-zinc-400">
                      {run.pr_number ? (
                        <span className="inline-flex items-center space-x-1 font-mono text-zinc-300 bg-zinc-800/70 px-2 py-0.5 rounded border border-zinc-700/50">
                          <GitPullRequest className="w-3 h-3 text-indigo-400" />
                          <span>PR #{run.pr_number}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Branch / Push</span>
                      )}
                    </td>

                    {/* Category Badge */}
                    <td className="py-3.5 px-4">
                      <CategoryBadge category={run.failure_category} size="sm" />
                    </td>

                    {/* Confidence */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              confidencePercent >= 90
                                ? 'bg-emerald-500'
                                : confidencePercent >= 75
                                ? 'bg-indigo-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${confidencePercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-zinc-300">
                          {confidencePercent}%
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {run.status === 'posted' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[11px] font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Commented</span>
                        </span>
                      ) : run.status === 'pending' ? (
                        <span className="inline-flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[11px] font-medium">
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Analyzing</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 text-[11px] font-medium">
                          <AlertCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                      {run.created_at
                        ? new Date(run.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        id={`view-detail-btn-${run.run_id}`}
                        className="inline-flex items-center space-x-1 text-xs font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3 bg-zinc-950/70 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
        <span>
          Showing <strong className="text-zinc-300">{filteredRuns.length}</strong> of{' '}
          <strong className="text-zinc-300">{runs.length}</strong> triage analyses
        </span>
        <div className="flex items-center space-x-2 text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Powered by Claude 3.5 Sonnet CI Log Parsing</span>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
