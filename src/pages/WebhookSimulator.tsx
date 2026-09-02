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
  CheckCircle2,
  XCircle,
  Cpu,
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

  // Model active / inactive status state
  const [modelStatus, setModelStatus] = useState<{
    groq_configured: boolean;
    claude_configured: boolean;
    active_primary: string;
  }>({
    groq_configured: false,
    claude_configured: false,
    active_primary: 'Heuristic Engine',
  });

  useEffect(() => {
    // Fetch system health / settings to check model active states
    const fetchModelStatus = async () => {
      try {
        const res = await axios.get('/api/health');
        if (res.data) {
          const groq = Boolean(res.data.groq_configured);
          const claude = Boolean(res.data.claude_configured);
          let primary = 'Heuristic Engine';
          if (groq) primary = 'Groq (qwen/qwen3.6-27b)';
          else if (claude) primary = 'Claude 3.5 Sonnet';

          setModelStatus({
            groq_configured: groq,
            claude_configured: claude,
            active_primary: primary,
          });
        }
      } catch {
        // Fallback: check localStorage
        try {
          const saved = localStorage.getItem('ci_bot_settings');
          if (saved) {
            const parsed = JSON.parse(saved);
            const groq = Boolean(parsed.groq_api_key);
            const claude = Boolean(parsed.claude_api_key);
            let primary = 'Heuristic Engine';
            if (groq) primary = 'Groq (qwen/qwen3.6-27b)';
            else if (claude) primary = 'Claude 3.5 Sonnet';

            setModelStatus({
              groq_configured: groq,
              claude_configured: claude,
              active_primary: primary,
            });
          }
        } catch { }
      }
    };

    fetchModelStatus();
  }, []);

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
      setTimeout(() => setStep(3), 700); // AI Dynamic Reasoning

      // Call backend triage endpoint
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
            Dispatch runner logs to the active AI diagnostic engine with automated failure analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Groq Model Status */}
          <div
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${modelStatus.groq_configured
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
          >
            {modelStatus.groq_configured ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Groq (qwen3.6-27b): {modelStatus.groq_configured ? 'ACTIVE (Primary)' : 'Inactive'}</span>
          </div>

          {/* Claude Model Status */}
          <div
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${modelStatus.claude_configured
              ? 'bg-blue-50 border-blue-300 text-blue-800'
              : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
          >
            {modelStatus.claude_configured ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Claude 3.5 Sonnet: {modelStatus.claude_configured ? (modelStatus.groq_configured ? 'ACTIVE (Secondary)' : 'ACTIVE (Primary)') : 'Inactive'}</span>
          </div>
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

        {/* Quick Sample Presets for HistoryPanel.tsx & CI tests */}
        <div className="flex flex-wrap items-center gap-1.5 py-1">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Log mẫu HistoryPanel:</span>
          <button
            type="button"
            onClick={() => setCustomLog(`[CI Run #8921] Running: npm run build
> react-calculator@1.0.0 build
> tsc && vite build

src/components/HistoryPanel.tsx:2:29 - error TS2307: Cannot find module '../types' or its corresponding type declarations.

2 import { HistoryItem } from '../types';
                              ~~~~~~~~~~

src/components/HistoryPanel.tsx:75:32 - error TS2339: Property 'expression' does not exist on type 'HistoryItem'.

75 <span className="font-mono">{item.expression}</span>
                                      ~~~~~~~~~~

src/components/HistoryPanel.tsx:78:33 - error TS2339: Property 'result' does not exist on type 'HistoryItem'.

78 = {item.result}
           ~~~~~~

Found 3 errors in src/components/HistoryPanel.tsx
Error: Process completed with exit code 2.`)}
            className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors cursor-pointer"
          >
            1. TS Missing Type / Field
          </button>

          <button
            type="button"
            onClick={() => setCustomLog(`[CI Workflow #9042] Running: npm test -- --coverage
> jest --coverage --ci

FAIL src/components/__tests__/HistoryPanel.test.tsx
  ● HistoryPanel Component › should render calculation history and trigger selection

    TypeError: onSelectHistory is not a function

      71 |                     id={\`history-item-\${item.id}\`}
      72 |                     onClick={() => {
    > 73 |                       onSelectHistory(item);
         |                       ^
      74 |                       onClose();
      75 |                     }}
      76 |                     className="w-full text-right p-3.5 rounded-2xl bg-neutral-800/40"

      at onClick (src/components/HistoryPanel.tsx:73:23)
      at HTMLUnknownElement.callCallback (node_modules/react-dom/cjs/react-dom.development.js:4164:14)
      at Object.invokeGuardedCallbackDev (node_modules/react-dom/cjs/react-dom.development.js:4213:16)
      at invokeGuardedCallback (node_modules/react-dom/cjs/react-dom.development.js:4277:31)
      at fireEvent (node_modules/@testing-library/dom/dist/events.js:16:11)
      at Object.<anonymous> (src/components/__tests__/HistoryPanel.test.tsx:48:5)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 4 passed, 5 total
Snapshots:   0 total
Time:        3.412 s
Error: Process completed with exit code 1.`)}
            className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors cursor-pointer"
          >
            2. Jest Unit Test TypeError
          </button>

          <button
            type="button"
            onClick={() => setCustomLog(`[CI Run #9103] Running: npm run build
> vite build

vite v5.4.2 building for production...
transforming...
✓ 48 modules transformed.
x Build failed with 1 error:
node_modules/motion/react/index.mjs:1:0: ERROR: Could not resolve "motion/react" (mark it as external or add package to dependencies)

[vite]: Rollup failed to resolve import "motion/react" from "src/components/HistoryPanel.tsx".
This is most likely not an issue with Vite itself, but with the package configuration or peer dependencies.

src/components/HistoryPanel.tsx:4:39:
4 | import { motion, AnimatePresence } from 'motion/react';
  |                                        ^

error during build:
Error: Rollup failed to resolve import "motion/react" from "src/components/HistoryPanel.tsx".
    at error (file:///home/runner/work/calc-app/node_modules/rollup/dist/es/shared/parseAst.js:337:30)
    at ModuleLoader.handleInvalidResolvedId (file:///home/runner/work/calc-app/node_modules/rollup/dist/es/shared/node-entry.js:19149:24)
Error: Process completed with exit code 1.`)}
            className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors cursor-pointer"
          >
            3. Vite Rollup Dependency Error
          </button>
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
              Log Ingestion &gt; Dynamic Context Trimmer &gt; {modelStatus.active_primary}
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
                  {step === 3 && `${modelStatus.active_primary} Diagnosing Root Cause...`}
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
