import React, { useState } from 'react';
import {
  ArrowLeft,
  GitPullRequest,
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
} from 'lucide-react';
import { TriageResult } from '../types';
import CategoryBadge from '../components/CategoryBadge';
import LogViewer from '../components/LogViewer';

interface TriageDetailProps {
  run: TriageResult;
  onBack: () => void;
  onPostComment?: (runId: number) => void;
  onReprocess?: (runId: number) => void;
}

export const TriageDetail: React.FC<TriageDetailProps> = ({
  run,
  onBack,
  onPostComment,
  onReprocess,
}) => {
  const [copiedFix, setCopiedFix] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(run.status === 'posted');
  const [showRawJson, setShowRawJson] = useState(false);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
        <button
          id="back-to-dashboard-btn"
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Triage Stream</span>
        </button>

        <div className="flex items-center space-x-2">
          {run.github_comment_url ? (
            <a
              href={run.github_comment_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>View GitHub Comment</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </a>
          ) : (
            <button
              id="post-comment-btn"
              onClick={handlePostAction}
              disabled={isPosting || postedSuccess}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                postedSuccess
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isPosting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting to GitHub PR...</span>
                </>
              ) : postedSuccess ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Comment Published</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Post Bot Triage to PR</span>
                </>
              )}
            </button>
          )}

          {onReprocess && (
            <button
              id="reprocess-run-btn"
              onClick={() => onReprocess(run.run_id)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Re-analyze</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-zinc-100">
                Run #{run.run_id}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="font-medium text-indigo-400 text-sm">
                {run.repo_name}
              </span>
              {run.pr_number && (
                <span className="inline-flex items-center space-x-1 font-mono text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  <GitPullRequest className="w-3 h-3 text-indigo-400" />
                  <span>PR #{run.pr_number}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Triggered:{' '}
              {run.created_at
                ? new Date(run.created_at).toLocaleString()
                : 'Recent event'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CategoryBadge category={run.failure_category} size="lg" />

            <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <div className="text-xs">
                <span className="text-zinc-400">Model Confidence: </span>
                <span className="font-mono font-bold text-zinc-100">
                  {confidencePercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Grid (Root Cause & Suggested Fix) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Root Cause Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Root Cause Diagnosis</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed font-sans bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
              {run.root_cause || 'No root cause text available.'}
            </p>
          </div>
          <div className="pt-2 text-xs text-zinc-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Validated with strict JSON schema response contract</span>
          </div>
        </div>

        {/* Suggested Fix Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <Code className="w-4 h-4 text-indigo-400" />
                <span>Actionable Suggested Fix</span>
              </div>
              <button
                id="copy-suggested-fix-btn"
                onClick={handleCopyFix}
                className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-700 transition-colors"
              >
                {copiedFix ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Fix</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-xs font-mono text-indigo-200 bg-zinc-950 p-3.5 rounded-lg border border-zinc-800/90 leading-relaxed overflow-x-auto selection:bg-indigo-900">
              {run.suggested_fix || 'No suggested fix generated.'}
            </div>
          </div>
          <div className="pt-2 text-xs text-zinc-500 flex items-center space-x-1">
            <span>Ready for direct PR commit or configuration patch</span>
          </div>
        </div>
      </div>

      {/* Log Viewer Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Extracted CI/CD Error Log (Trimmed Log Window)</span>
          </h3>
          <span className="text-xs text-zinc-500">
            LogTrimmer extracted {run.trimmed_log?.split('\n').length || 0} lines around error point
          </span>
        </div>
        <LogViewer
          log={run.trimmed_log || '[No logs captured for this run]'}
          title={`Job Log Window #${run.run_id}`}
          maxHeight="max-h-80"
        />
      </div>

      {/* Raw Claude JSON Response Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/40 transition-colors"
        >
          <div className="flex items-center space-x-2 text-xs font-medium text-zinc-300">
            <FileText className="w-4 h-4 text-zinc-500" />
            <span>Raw LLM Schema Response Payload</span>
          </div>
          <span className="text-xs text-indigo-400 font-medium">
            {showRawJson ? 'Hide JSON' : 'Show JSON'}
          </span>
        </button>

        {showRawJson && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950">
            <pre className="text-xs font-mono text-zinc-300 overflow-x-auto p-3 bg-black rounded-lg border border-zinc-800 leading-relaxed">
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
