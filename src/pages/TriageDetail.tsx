import React, { useState } from 'react';
import axios from 'axios';
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
  Lightbulb,
  CheckSquare,
  Send,
  Bot,
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

  // Interactive AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);
  const [userQuery, setUserQuery] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

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
    }, 800);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isAiThinking) return;

    const query = userQuery.trim();
    setUserQuery('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setIsAiThinking(true);

    try {
      const res = await axios.post('/api/ai/chat', {
        run_id: run.run_id,
        message: query,
        log_context: `Repo: ${run.repo_name}\nRoot Cause: ${run.root_cause}\nSuggested Fix:\n${run.suggested_fix}\nLog Snippet:\n${run.trimmed_log}`,
      });

      if (res.data && res.data.reply) {
        setChatMessages((prev) => [...prev, { sender: 'ai', text: res.data.reply }]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `AI Assistant response error: ${err.response?.data?.error || err.message}.`,
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const confidencePercent = Math.round((run.confidence_score || 0.95) * 100);

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
          <span>Back to Triage History</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {isSim || run.bot_action === 'Nothing' || run.status === 'nothing' ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
              <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
              <span>Bot Action: <strong className="text-slate-900">Nothing</strong> (Simulated)</span>
            </span>
          ) : run.github_comment_url ? (
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
                  <span>Publishing Triage Comment...</span>
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
              <span>Re-run AI Diagnosis</span>
            </button>
          )}

          {onDelete && (
            <button
              id="delete-run-detail-btn"
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete triage record #${run.run_id}?`
                  )
                ) {
                  onDelete(run);
                  onBack();
                }
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Summary Card */}
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
                  <span>SIMULATED RUN</span>
                </span>
              )}

              {run.offending_file && (
                <span className="inline-flex items-center space-x-1 font-mono text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <span>File: {run.offending_file}</span>
                  {run.offending_line ? <span>:{run.offending_line}</span> : null}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Analyzed at:{' '}
              <span className="font-mono text-slate-800 font-semibold">
                {formatGMT7(run.created_at, { includeTimezoneLabel: true })}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CategoryBadge category={run.failure_category} size="lg" />

            <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <div className="text-xs">
                <span className="text-emerald-800 font-medium">
                  {run.engine_used || 'AI'} Confidence:{' '}
                </span>
                <span className="font-mono font-bold text-emerald-950">
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
                Bot comment published to GitHub (
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
              <span>AI Root Cause Diagnosis</span>
            </div>
            <div className="text-sm text-slate-800 leading-relaxed font-sans bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <p>{run.root_cause || 'No root cause description available.'}</p>
              {run.offending_file && (
                <div className="text-xs font-mono text-slate-600 pt-1 border-t border-slate-200 flex items-center space-x-2">
                  <span className="font-semibold text-slate-800">Fault Location:</span>
                  <span>{run.offending_file}{run.offending_line ? `:${run.offending_line}` : ''}</span>
                </div>
              )}
            </div>
          </div>
          <div className="pt-2 text-xs text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Diagnosed via Claude AI Failure Reasoning</span>
          </div>
        </div>

        {/* Suggested Fix Card */}
        <div className={`${theme.cards.base} space-y-3 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Code className="w-4 h-4 text-emerald-600" />
                <span>Actionable Code Remediation</span>
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
            <div className="text-xs font-mono text-emerald-950 bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-200 leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-emerald-200">
              {run.suggested_fix || 'No suggested fix available.'}
            </div>
          </div>
          <div className="pt-2 text-xs text-slate-500 flex items-center space-x-1">
            <span>Ready to apply to repository source code or CI workflow</span>
          </div>
        </div>
      </div>

      {/* Remediation Steps & Prevention Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Remediation Checklist */}
        <div className={`${theme.cards.base} space-y-3`}>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>Step-by-Step Remediation Plan</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            {run.remediation_steps && run.remediation_steps.length > 0 ? (
              run.remediation_steps.map((step, idx) => (
                <li key={idx} className="flex items-start space-x-2 p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="font-mono font-bold text-emerald-700 shrink-0">{idx + 1}.</span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))
            ) : (
              <li className="p-2 rounded bg-slate-50 border border-slate-200 leading-relaxed">
                1. Inspect the offending file and line mentioned in the diagnosis.<br />
                2. Apply the corrected code patch or dependency installation.<br />
                3. Execute local test suite (`npm run build` or `npm test`) prior to pushing.
              </li>
            )}
          </ul>
        </div>

        {/* Prevention Tip */}
        <div className={`${theme.cards.base} space-y-3`}>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Prevention & Quality Assurance</span>
          </div>
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-950 leading-relaxed space-y-2">
            <p className="font-medium">
              {run.prevention_tip || 'Configure pre-commit linters and local typecheck scripts to catch errors prior to CI runner execution.'}
            </p>
            <div className="text-[11px] text-amber-800 pt-2 border-t border-amber-200/60">
              Tip: Integrate pre-commit hooks to automatically check modified files on git commit.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Ask Claude Assistant */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Ask Claude AI About This Error
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Interactive follow-up inquiries, unit test generation & explanation
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* Chat message history */}
          {chatMessages.length > 0 && (
            <div className="space-y-3 max-h-72 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${msg.sender === 'user'
                    ? 'bg-emerald-600 text-white ml-8'
                    : 'bg-white text-slate-800 border border-slate-200 mr-8 leading-relaxed whitespace-pre-wrap font-sans'
                    }`}
                >
                  <div className="font-semibold mb-1 text-[11px] opacity-80 flex items-center space-x-1">
                    {msg.sender === 'user' ? <span>Developer</span> : <><Bot className="w-3.5 h-3.5 text-emerald-600" /><span>Claude AI</span></>}
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
              {isAiThinking && (
                <div className="p-3 bg-white text-slate-600 border border-slate-200 rounded-lg mr-8 text-xs flex items-center space-x-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Claude is analyzing response...</span>
                </div>
              )}
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about this CI failure, typing, or remediation..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 shadow-xs"
            />
            <button
              type="submit"
              disabled={isAiThinking || !userQuery.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </form>
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
            LogTrimmer extracted {run.trimmed_log?.split('\n').length || 0} lines around fault point
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
            <span>Raw Claude AI JSON Output</span>
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
                    offending_file: run.offending_file,
                    offending_line: run.offending_line,
                    root_cause: run.root_cause,
                    suggested_fix: run.suggested_fix,
                    remediation_steps: run.remediation_steps,
                    prevention_tip: run.prevention_tip,
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
