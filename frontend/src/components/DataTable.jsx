// frontend/src/components/DataTable.jsx
import React from 'react';
import { ExternalLink, CheckCircle2, Clock, AlertCircle, ChevronRight, GitPullRequest } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

export default function DataTable({ runs, loading, onSelectRun }) {
  if (loading && (!runs || runs.length === 0)) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center shadow-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-4"></div>
        <p className="text-zinc-400 font-medium">Loading CI Failure Triage runs...</p>
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto mb-3">
          <GitPullRequest className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-zinc-200">No Triaged Failures Found</h4>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
          When GitHub Actions runs fail, webhooks will automatically appear here with AI root-cause diagnoses.
        </p>
      </div>
    );
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + d.toLocaleDateString() + ')';
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <th className="py-3.5 px-5">Repository</th>
              <th className="py-3.5 px-4">Pull Request / Run</th>
              <th className="py-3.5 px-4">Failure Category</th>
              <th className="py-3.5 px-4">Confidence</th>
              <th className="py-3.5 px-4">Triage Time</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs">
            {runs.map((run) => {
              const isPosted = run.status === 'posted';
              const isPending = run.status === 'pending';
              const isError = run.status === 'error';

              return (
                <tr
                  key={run.id || run.run_id}
                  onClick={() => onSelectRun(run)}
                  className="hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-5 font-medium text-zinc-100 flex items-center space-x-2">
                    <span className="font-mono text-xs text-indigo-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {run.repo_name}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-zinc-400">
                    <div className="flex items-center space-x-1.5 font-medium">
                      <GitPullRequest className="w-4 h-4 text-zinc-500" />
                      <span>{run.pr_number ? `#${run.pr_number} PR` : `Run #${run.run_id}`}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <CategoryBadge category={run.failure_category} />
                  </td>

                  <td className="py-4 px-4 font-mono text-xs font-semibold text-zinc-300">
                    {run.confidence_score ? `${(run.confidence_score * 100).toFixed(0)}%` : '—'}
                  </td>

                  <td className="py-4 px-4 text-xs text-zinc-500 whitespace-nowrap">
                    {formatTime(run.created_at)}
                  </td>

                  <td className="py-4 px-4">
                    {isPosted && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Comment Posted</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Analyzing...</span>
                      </span>
                    )}
                    {isError && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Error</span>
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <button className="text-zinc-500 group-hover:text-indigo-400 transition inline-flex items-center space-x-1 text-xs font-semibold">
                      <span>Inspect</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
