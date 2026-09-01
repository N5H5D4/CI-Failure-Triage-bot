import React, { useState } from 'react';
import {
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  GitPullRequest,
  Terminal,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  FlaskConical,
  Trash2,
} from 'lucide-react';
import { TriageResult } from '../types';
import CategoryBadge from './CategoryBadge';
import { theme } from '../styles/theme';
import { getGMT7Parts } from '../utils/date';

export const isSimulatedRun = (run: TriageResult): boolean => {
  return Boolean(
    run.is_simulated === true ||
    run.repo_name?.toLowerCase().includes('simulated') ||
    run.raw_response?.includes('"simulated": true')
  );
};

interface DataTableProps {
  runs: TriageResult[];
  onSelectRun: (run: TriageResult) => void;
  onDeleteRun?: (run: TriageResult) => void;
  isLoading?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  runs,
  onSelectRun,
  onDeleteRun,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL'); // ALL | REAL | SIMULATED
  const [visibleCount, setVisibleCount] = useState<number>(20);

  const filteredRuns = runs.filter((run) => {
    const isSim = isSimulatedRun(run);
    const matchesSource =
      sourceFilter === 'ALL' ||
      (sourceFilter === 'SIMULATED' && isSim) ||
      (sourceFilter === 'REAL' && !isSim);

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

    return matchesSource && matchesSearch && matchesCategory && matchesStatus;
  });

  const displayedRuns = filteredRuns.slice(0, visibleCount);

  const categories = [
    { value: 'ALL', label: 'All Categories' },
    { value: 'syntax_error', label: 'Syntax Error' },
    { value: 'test_failure', label: 'Test Failure' },
    { value: 'dependency_issue', label: 'Dependency Issue' },
    { value: 'flaky_test', label: 'Flaky Test' },
    { value: 'infrastructure_timeout', label: 'Infra / Timeout' },
  ];

  return (
    <div className={theme.tables.wrapper}>
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50/70">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-runs-input"
            type="text"
            placeholder="Search repository, Run ID, or error keyword..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(20);
            }}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Source dropdown: All / Live Webhook / Simulated */}
          <div className="flex items-center space-x-1 text-xs text-slate-600">
            <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
            <select
              id="filter-source-select"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setVisibleCount(20);
              }}
              className={theme.inputs.select}
            >
              <option value="ALL">All Sources (Webhook & Sim)</option>
              <option value="REAL">Live Webhook Only</option>
              <option value="SIMULATED">Simulated Only</option>
            </select>
          </div>

          {/* Category dropdown */}
          <div className="flex items-center space-x-1 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              id="filter-category-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setVisibleCount(20);
              }}
              className={theme.inputs.select}
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
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setVisibleCount(20);
            }}
            className={theme.inputs.select}
          >
            <option value="ALL">All Statuses</option>
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
            <tr className={theme.tables.headerRow}>
              <th className={theme.tables.th}>Run / Job ID</th>
              <th className={theme.tables.th}>Repository & Source</th>
              <th className={theme.tables.th}>Context</th>
              <th className={theme.tables.th}>Diagnosis Category</th>
              <th className={theme.tables.th}>Confidence</th>
              <th className={theme.tables.th}>Bot Status</th>
              <th className={theme.tables.th}>Time</th>
              <th className={`${theme.tables.th} text-right pr-2 w-24`}>Actions</th>
              <th className="w-10 pr-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading triage stream logs...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                    <span className="text-slate-700 font-medium">
                      No triage records found
                    </span>
                    <span className="text-slate-500 text-xs">
                      Try adjusting filters or simulate a CI webhook failure event.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              displayedRuns.map((run) => {
                const confidencePercent = Math.round(
                  (run.confidence_score || 0.9) * 100
                );
                const isSim = isSimulatedRun(run);

                return (
                  <tr
                    key={run.id || run.run_id}
                    id={`run-row-${run.run_id}`}
                    onClick={() => onSelectRun(run)}
                    className={`${theme.tables.tr} ${isSim ? 'bg-purple-50/40 hover:bg-purple-50/70' : ''
                      }`}
                  >
                    {/* Run ID */}
                    <td className={`${theme.tables.td} font-mono font-medium text-slate-800`}>
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        <span>#{run.run_id}</span>
                      </div>
                    </td>

                    {/* Repo Name & Source Badge */}
                    <td className={`${theme.tables.td} font-medium text-slate-900`}>
                      <div className="space-y-1">
                        <span className="text-emerald-700 font-semibold hover:underline">
                          {run.repo_name}
                        </span>
                        {isSim ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              <FlaskConical className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                              <span>SIMULATED</span>
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>LIVE WEBHOOK</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* PR # / Context */}
                    <td className={`${theme.tables.td} text-slate-600`}>
                      {run.pr_number ? (
                        <span className="inline-flex items-center space-x-1 font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <GitPullRequest className="w-3 h-3 text-emerald-600" />
                          <span>PR #{run.pr_number}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Branch / Push</span>
                      )}
                    </td>

                    {/* Category Badge */}
                    <td className={theme.tables.td}>
                      <CategoryBadge category={run.failure_category} size="sm" />
                    </td>

                    {/* Confidence */}
                    <td className={theme.tables.td}>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${confidencePercent >= 90
                              ? 'bg-emerald-500'
                              : confidencePercent >= 75
                                ? 'bg-teal-500'
                                : 'bg-amber-500'
                              }`}
                            style={{ width: `${confidencePercent}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {confidencePercent}%
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className={theme.tables.td}>
                      {run.status === 'posted' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px] font-medium">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Commented</span>
                        </span>
                      ) : run.status === 'pending' ? (
                        <span className="inline-flex items-center space-x-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[11px] font-medium">
                          <Clock className="w-3 h-3 animate-spin text-amber-600" />
                          <span>Diagnosing</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[11px] font-medium">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Error</span>
                        </span>
                      )}
                    </td>

                    {/* Timestamp (GMT+7 with Date, Month, Year & Time) */}
                    <td className={`${theme.tables.td} text-slate-700 whitespace-nowrap text-xs`}>
                      {(() => {
                        const { date, time } = getGMT7Parts(run.created_at);
                        return (
                          <div className="flex flex-col">
                            <span className="font-mono text-slate-800 text-[11px] font-semibold">{date}</span>
                            <span className="font-mono text-slate-500 text-[10px]">{time} <span className="text-[9px] text-emerald-700 font-medium">(GMT+7)</span></span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Action - Clean View Link */}
                    <td className={`${theme.tables.td} text-right pr-2 whitespace-nowrap`}>
                      <button
                        id={`view-detail-btn-${run.run_id}`}
                        onClick={() => onSelectRun(run)}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 group-hover:translate-x-0.5 transition-all cursor-pointer"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Outermost Right Delete Button */}
                    <td
                      className="py-3.5 pr-3 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onDeleteRun && (
                        <button
                          id={`delete-run-btn-${run.run_id}`}
                          title="Delete this record from triage.db"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Delete triage record #${run.run_id} (${run.repo_name}) from database?`
                              )
                            ) {
                              onDeleteRun(run);
                            }
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Load More (+20) Button Banner if more items exist */}
      {filteredRuns.length > visibleCount && (
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-600">
            Showing <strong className="text-slate-900">{displayedRuns.length}</strong> of{' '}
            <strong className="text-slate-900">{filteredRuns.length}</strong> records
          </span>

          <button
            id="load-more-failures-btn"
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
            <span>Load 20 More Failures (+20)</span>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-mono font-bold">
              +{Math.min(20, filteredRuns.length - visibleCount)} remaining
            </span>
          </button>
        </div>
      )}

      {/* Table Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Showing <strong className="text-slate-800">{displayedRuns.length}</strong> of{' '}
          <strong className="text-slate-800">{filteredRuns.length}</strong> matching (
          <strong className="text-slate-800">{runs.length}</strong> total)
        </span>
        <div className="flex items-center space-x-2 text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Clean Architecture AI Triage Stream</span>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
