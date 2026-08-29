// frontend/src/pages/TriageDetail.jsx
import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, ExternalLink, Copy, Check, Sparkles, Terminal, Code2, GitPullRequest, CheckCircle2 } from 'lucide-react';
import CategoryBadge from '../components/CategoryBadge';
import LogViewer from '../components/LogViewer';

export default function TriageDetail({ run, onBack, onRetry, isRetrying }) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'log' | 'json' | 'comment'
  const [copied, setCopied] = useState(false);

  if (!run) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-zinc-400">
        <p>No triage run selected.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const confidencePercent = run.confidence_score ? Math.round(run.confidence_score * 100) : 85;

  const markdownPreview = `### 🤖 CI Failure Triage Bot Analysis

**Phân loại lỗi:** ${run.failure_category} | **Độ tin cậy của AI:** ${confidencePercent}%

#### 🔍 Nguyên nhân gốc rễ (Root Cause)
> ${run.root_cause || 'Analyzing...'}

#### 💡 Đề xuất sửa lỗi (Suggested Fix)
\`\`\`text
${run.suggested_fix || 'No suggested fix generated.'}
\`\`\`

---
*Báo cáo tự động bởi CI Failure Triage Bot | ${run.repo_name} (Run #${run.run_id})*`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Navigation & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-zinc-800 mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 shadow-sm transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-indigo-400 bg-zinc-950 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                {run.repo_name}
              </span>
              <span className="text-zinc-600">/</span>
              <h1 className="text-xl font-bold text-zinc-100 font-sans">
                {run.pr_number ? `Pull Request #${run.pr_number}` : `Workflow Run #${run.run_id}`}
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Logged at {new Date(run.created_at || Date.now()).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onRetry(run.run_id)}
            disabled={isRetrying}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Re-triaging...' : 'Re-triage (Claude AI)'}</span>
          </button>

          {run.pr_number && (
            <a
              href={`https://github.com/${run.repo_name}/pull/${run.pr_number}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mb-6 space-x-6">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center space-x-2 ${
            activeTab === 'summary'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Triage Diagnosis</span>
        </button>

        <button
          onClick={() => setActiveTab('log')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center space-x-2 ${
            activeTab === 'log'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Trimmed CI Log</span>
        </button>

        <button
          onClick={() => setActiveTab('comment')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center space-x-2 ${
            activeTab === 'comment'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GitPullRequest className="w-4 h-4" />
          <span>GitHub PR Comment Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center space-x-2 ${
            activeTab === 'json'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Raw JSON Response</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Top Status & Confidence Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Classification</span>
              <div className="mt-2">
                <CategoryBadge category={run.failure_category} />
              </div>
            </div>

            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Confidence Score</span>
              <div className="flex items-center space-x-3 mt-1.5">
                <div className="flex-1 bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${confidencePercent}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold font-mono text-zinc-100">{confidencePercent}%</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dispatch Status</span>
              <div className="mt-1 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-zinc-200 capitalize">{run.status || 'Posted'}</span>
              </div>
            </div>
          </div>

          {/* Root Cause Card */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">🔍 Root Cause Explanation</h3>
            </div>
            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-200 text-xs leading-relaxed">
              {run.root_cause || 'Analyzing offending error lines from CI logs...'}
            </div>
          </div>

          {/* Suggested Fix Card */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">💡 Suggested Actionable Fix</h3>
            </div>
            <div className="bg-black p-4 rounded-xl border border-zinc-800 font-mono text-xs text-indigo-300 leading-relaxed whitespace-pre-wrap">
              {run.suggested_fix || 'No remediation suggested yet.'}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'log' && (
        <LogViewer logText={run.trimmed_log || 'No trimmed log saved for this run.'} />
      )}

      {activeTab === 'comment' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
          <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                bot
              </div>
              <span className="text-xs font-bold text-zinc-200">github-actions[bot]</span>
              <span className="text-xs text-zinc-500">commented on pull request</span>
            </div>
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center space-x-1 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Markdown' : 'Copy Markdown'}</span>
            </button>
          </div>
          <div className="p-6 text-zinc-200 space-y-4 text-xs font-sans">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase">Classification</span>
                  <div className="mt-1"><CategoryBadge category={run.failure_category} /></div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-400 uppercase">AI Confidence</span>
                  <p className="text-base font-bold font-mono text-zinc-100">{confidencePercent}%</p>
                </div>
              </div>
            </div>

            <h4 className="font-bold text-zinc-100 text-sm">🔍 Root Cause</h4>
            <blockquote className="border-l-4 border-zinc-700 pl-3 italic text-zinc-300 my-2 bg-zinc-950/60 p-2 rounded-r">
              {run.root_cause}
            </blockquote>

            <h4 className="font-bold text-zinc-100 text-sm mt-4">💡 Suggested Fix</h4>
            <pre className="bg-black text-indigo-300 p-3 rounded-lg text-xs font-mono border border-zinc-800">
              {run.suggested_fix}
            </pre>
            <p className="text-[11px] text-zinc-500 mt-4 border-t border-zinc-800 pt-2">
              Generated automatically by Anthropic Claude 3 AI Triage Engine.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'json' && (
        <div className="bg-black p-6 rounded-xl border border-zinc-800 font-mono text-xs text-indigo-300 overflow-x-auto">
          <pre>{JSON.stringify(run, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
