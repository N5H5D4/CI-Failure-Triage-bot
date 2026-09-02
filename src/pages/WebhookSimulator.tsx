import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Play,
  AlertCircle,
  Terminal,
  Sparkles,
  GitBranch,
  RefreshCw,
  GitPullRequest,
  GitCommit,
  Trash2,
  FolderGit2,
  Bot,
} from 'lucide-react';
import { TriageResult, RepositoryConfig } from '../types';
import { theme } from '../styles/theme';
import { analyzeCILog } from '../utils/triageEngine';

interface WebhookSimulatorProps {
  repos?: RepositoryConfig[];
  onSimulateComplete: (newResult: TriageResult) => void;
}

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({
  repos = [],
  onSimulateComplete,
}) => {
  const firstActiveRepo = repos.find((r) => r.is_active) || repos[0];

  const [selectedRepoMode, setSelectedRepoMode] = useState<string>(
    firstActiveRepo ? `${firstActiveRepo.owner}/${firstActiveRepo.name}` : 'custom'
  );
  const [customRepoName, setCustomRepoName] = useState<string>(
    firstActiveRepo ? `${firstActiveRepo.owner}/${firstActiveRepo.name}` : ''
  );

  const [isPullRequest, setIsPullRequest] = useState<boolean>(true);
  const [prNumber, setPrNumber] = useState<number | ''>(1);
  const [customLog, setCustomLog] = useState<string>('');

  const [step, setStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (repos.length > 0 && selectedRepoMode !== 'custom') {
      const active = repos.find((r) => r.is_active) || repos[0];
      const name = `${active.owner}/${active.name}`;
      setSelectedRepoMode(name);
      setCustomRepoName(name);
    }
  }, [repos]);

  const activeTargetRepo =
    selectedRepoMode === 'custom' ? customRepoName.trim() : selectedRepoMode;

  const handleRunSimulation = async () => {
    if (!customLog.trim()) {
      setErrorMsg('Please enter or paste the CI failure log stream.');
      return;
    }

    if (!activeTargetRepo) {
      setErrorMsg('Please specify a target repository (e.g. owner/repo).');
      return;
    }

    setErrorMsg(null);
    setIsSimulating(true);
    setStep(1); // Ingesting webhook

    try {
      setTimeout(() => setStep(2), 350); // Trimming log window
      setTimeout(() => setStep(3), 700); // Claude AI Dynamic Reasoning

      // Call backend Claude AI endpoint
      const res = await axios.post(
        '/api/simulate-triage',
        {
          repo_name: activeTargetRepo,
          run_id: Math.floor(1000000000 + Math.random() * 9000000000),
          pr_number: isPullRequest && prNumber ? Number(prNumber) : null,
          raw_log: customLog.trim(),
        },
        { timeout: 35000 }
      );

      setStep(4);
      await new Promise((r) => setTimeout(r, 300));
      setIsSimulating(false);

      if (res.data) {
        onSimulateComplete({
          ...res.data,
          is_simulated: true,
          status: 'nothing',
          bot_action: 'Nothing',
        });
      }
    } catch (err: any) {
      console.warn('[Simulator Fallback] Backend offline or request timed out:', err);
      setStep(4);
      const diagnosed = analyzeCILog(
        customLog,
        activeTargetRepo,
        isPullRequest && prNumber ? Number(prNumber) : null
      );
      setIsSimulating(false);
      onSimulateComplete({
        ...diagnosed,
        status: 'nothing',
        bot_action: 'Nothing',
        is_simulated: true,
      });
    }
  };

  const lineCount = customLog ? customLog.split('\n').length : 0;
  const charCount = customLog.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans tracking-tight flex items-center space-x-2">
            <span>CI/CD Webhook & Log Ingestion Simulator</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Dispatch runner logs to the <strong>Groq AI</strong> diagnostic engine with automatic fallback.
          </p>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold self-start sm:self-auto">
          <Bot className="w-4 h-4 text-blue-600" />
          <span>Groq AI Active</span>
        </div>
      </div>

      {/* Target Repo & Settings Panel */}
      <div className={`${theme.cards.base} space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <FolderGit2 className="w-4 h-4 text-emerald-600" />
            <span>Target Repository</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Select a connected repo or enter any custom repository
          </span>
        </div>

        {/* Connected Repos Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {repos.map((r) => {
            const fullName = `${r.owner}/${r.name}`;
            const isSelected = selectedRepoMode === fullName;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRepoMode(fullName);
                  setCustomRepoName(fullName);
                }}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${isSelected
                  ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-slate-900 truncate">
                    {fullName}
                  </div>
                  {r.is_active && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2"></span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                  <GitBranch className="w-3 h-3 text-slate-400" />
                  <span>Monitored Repository</span>
                </div>
              </button>
            );
          })}

          {/* Custom Repo Option */}
          <button
            type="button"
            onClick={() => setSelectedRepoMode('custom')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${selectedRepoMode === 'custom' || repos.length === 0
              ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
          >
            <div className="font-semibold text-xs text-slate-900">
              Custom Repository
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Enter any repository (owner/name)
            </div>
          </button>
        </div>

        {(selectedRepoMode === 'custom' || repos.length === 0) && (
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Repository Name (owner/repo format)
            </label>
            <input
              type="text"
              placeholder="e.g., your-org/your-repo"
              value={customRepoName}
              onChange={(e) => setCustomRepoName(e.target.value)}
              className={theme.inputs.base}
            />
          </div>
        )}

        {/* PR Context Toggle */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="triggerType"
                checked={isPullRequest}
                onChange={() => setIsPullRequest(true)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center space-x-1">
                <GitPullRequest className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pull Request Workflow</span>
              </span>
            </label>

            <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="triggerType"
                checked={!isPullRequest}
                onChange={() => setIsPullRequest(false)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center space-x-1">
                <GitCommit className="w-3.5 h-3.5 text-slate-500" />
                <span>Direct Branch Push</span>
              </span>
            </label>
          </div>

          {isPullRequest && (
            <div className="flex items-center space-x-2">
              <span className="text-slate-600 text-xs">PR Number:</span>
              <input
                type="number"
                min={1}
                value={prNumber}
                onChange={(e) =>
                  setPrNumber(e.target.value ? Number(e.target.value) : '')
                }
                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 text-center shadow-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main CI Runner Log Stream Input */}
      <div className={`${theme.cards.base} space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Terminal className="w-4 h-4 text-emerald-600" />
            <span>Raw CI Runner Log Stream / Error Output</span>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span>
              {lineCount} lines • {charCount} chars
            </span>
            {customLog && (
              <button
                type="button"
                onClick={() => setCustomLog('')}
                className="inline-flex items-center space-x-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Clear log contents"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <textarea
            rows={13}
            value={customLog}
            onChange={(e) => setCustomLog(e.target.value)}
            placeholder="Paste raw console error logs, compiler stack traces, or runner output from GitHub Actions here..."
            className="w-full p-4 font-mono text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 leading-relaxed scrollbar-thin shadow-inner"
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button & Pipeline Progress */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>
              Log Ingestion &gt; Dynamic Context Trimmer &gt; Claude AI Failure Reasoning
            </span>
          </div>

          <button
            id="run-simulation-btn"
            type="button"
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className={theme.buttons.primary}
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {step === 1 && 'Ingesting CI Log Payload...'}
                  {step === 2 && 'Trimming Noise & Isolating Fault...'}
                  {step === 3 && 'Claude AI Diagnosing Root Cause...'}
                  {step >= 4 && 'Synthesizing Actionable Triage...'}
                </span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run AI Diagnosis</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebhookSimulator;
