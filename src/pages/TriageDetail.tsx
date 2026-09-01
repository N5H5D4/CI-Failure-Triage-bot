import React, { useState } from 'react';
import {
  ArrowLeft,
  GitPullRequest,
  GitCommit,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Terminal,
  Sparkles,
  Code,
  FileText,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  FlaskConical,
  Trash2,
} from 'lucide-react';
import { TriageResult } from '../types';
import CategoryBadge from '../components/CategoryBadge';
import LogViewer from '../components/LogViewer';
import { isSimulatedRun } from '../components/DataTable';
import { theme } from '../styles/theme';
import { formatGMT7 } from '../utils/date';

interface TriageDetailProps {
  run: TriageResult;
  onBack: () => void;
  onPostComment?: (runId: number) => void;
  onReprocess?: (runId: number) => void;
  onDelete?: (run: TriageResult) => void;
}

export const TriageDetail: React.FC<TriageDetailProps> = ({
  run,
  onBack,
  onPostComment,
  onReprocess,
  onDelete,
}) => {
  const [copiedFix, setCopiedFix] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(run.status === 'posted');
  const [showRawJson, setShowRawJson] = useState(false);

  const isSim = isSimulatedRun(run);

  const handleCopyFix = () => {
    if (run.suggested_fix) {
      navigator.clipboard.writeText(run.suggested_fix);
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    }
  };

  const handlePostAction = async () => {
    setIsPosting(true);
    if (onPostComment && run.run_id) {
      await onPostComment(run.run_id);
    }
    setTimeout(() => {
      setIsPosting(false);
      setPostedSuccess(true);
    }, 900);
  };

  const confidencePercent = Math.round((run.confidence_score || 0.9) * 100);

  return (
    <div className="space-y-6">
      {/* Navigation and Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <button
          id="back-to-dashboard-btn"
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {run.github_comment_url ? (
            <a
              href={run.github_comment_url}
              target="_blank"
              rel="noreferrer"
              className={theme.buttons.secondary}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>View GitHub Comment</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          ) : run.pr_number ? (
            <button
              id="post-comment-btn"
              onClick={handlePostAction}
              disabled={isPosting || postedSuccess}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${postedSuccess
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-700/20'
                }`}
            >
              {isPosting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting to GitHub PR...</span>
                </>
              ) : postedSuccess ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Comment Published</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Post Triage to PR #{run.pr_number}</span>
                </>
              )}
            </button>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Diagnosis Complete</span>
            </span>
          )}

          {onReprocess && (
            <button
              id="reprocess-run-btn"
              onClick={() => onReprocess(run.run_id)}
              className={theme.buttons.secondary}
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Re-analyze</span>
            </button>
          )}

          {onDelete && (
            <button
              id="delete-run-detail-btn"
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to permanently delete triage record #${run.run_id} from triage.db?`
                  )
                ) {
                  onDelete(run);
                  onBack();
                }
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className={`${theme.cards.base} space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">
                Run #{run.run_id}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-emerald-700 text-sm">
                {run.repo_name}
              </span>
              {run.pr_number ? (
                <span className="inline-flex items-center space-x-1 font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <GitPullRequest className="w-3 h-3 text-emerald-600" />
                  <span>PR #{run.pr_number}</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <GitCommit className="w-3 h-3 text-slate-500" />
                  <span>Branch Push</span>
                </span>
              )}

              {isSim && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                  <span>SIMULATED TEST</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Triggered at:{' '}
              <span className="font-mono text-slate-800 font-semibold">
                {formatGMT7(run.created_at, { includeTimezoneLabel: true })}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CategoryBadge category={run.failure_category} size="lg" />

            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <div className="text-xs">
                <span className="text-slate-500">Model Confidence: </span>
                <span className="font-mono font-bold text-slate-900">
                  {confidencePercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {run.github_comment_url && (
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-emerald-700 font-semibold">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                Bot comment posted to GitHub (
                {run.pr_number ? `Pull Request #${run.pr_number}` : 'Commit thread'}
                )
              </span>
            </div>
            <a
              href={run.github_comment_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 text-emerald-700 hover:text-emerald-800 font-semibold underline underline-offset-4"
            >
              <span>Open comment on GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Analysis Grid (Root Cause & Suggested Fix) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Root Cause Card */}
        <div className={`${theme.cards.base} space-y-3 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Root Cause Diagnosis</span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-sans bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              {run.root_cause || 'No root cause description available.'}
            </p>
          </div>
          <div className="pt-2 text-xs text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strictly validated against JSON schema contract</span>
          </div>
        </div>

        {/* Suggested Fix Card */}
        <div className={`${theme.cards.base} space-y-3 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Code className="w-4 h-4 text-emerald-600" />
                <span>Actionable Remediation</span>
              </div>
              <button
                id="copy-suggested-fix-btn"
                onClick={handleCopyFix}
                className={theme.buttons.outline}
              >
                {copiedFix ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Fix</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-xs font-mono text-emerald-900 bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200 leading-relaxed overflow-x-auto selection:bg-emerald-200">
              {run.suggested_fix || 'No suggested fix available.'}
            </div>
          </div>
          <div className="pt-2 text-xs text-slate-500 flex items-center space-x-1">
            <span>Ready to apply in commit or CI workflow configuration</span>
          </div>
        </div>
      </div>

      {/* Log Viewer Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-600" />
            <span>Trimmed Failure Log Window</span>
          </h3>
          <span className="text-xs text-slate-500">
            LogTrimmer extracted {run.trimmed_log?.split('\n').length || 0} lines around crash point
          </span>
        </div>
        <LogViewer
          log={run.trimmed_log || '[No logs recorded for this run]'}
          title={`Job Log Window #${run.run_id}`}
          maxHeight="max-h-80"
        />
      </div>

      {/* Raw Claude JSON Response Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Raw LLM JSON Schema Output</span>
          </div>
          <span className="text-xs text-emerald-700 font-semibold">
            {showRawJson ? 'Hide JSON' : 'Show JSON'}
          </span>
        </button>

        {showRawJson && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <pre className="text-xs font-mono text-slate-100 overflow-x-auto p-3 bg-slate-950 rounded-lg border border-slate-800 leading-relaxed shadow-inner">
              {run.raw_response ||
                JSON.stringify(
                  {
                    failure_category: run.failure_category,
                    confidence_score: run.confidence_score,
                    root_cause: run.root_cause,
                    suggested_fix: run.suggested_fix,
                  },
                  null,
                  2
                )}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TriageDetail;
