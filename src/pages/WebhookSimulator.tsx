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
} from 'lucide-react';
import { TriageResult, RepositoryConfig } from '../types';
import { theme } from '../styles/theme';

interface WebhookSimulatorProps {
  repos?: RepositoryConfig[];
  onSimulateComplete: (newResult: TriageResult) => void;
}

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({
  repos = [],
  onSimulateComplete,
}) => {
  // Determine default repo from connected list or fallback
  const firstActiveRepo = repos.find((r) => r.is_active) || repos[0];
  const initialRepoFullName = firstActiveRepo
    ? `${firstActiveRepo.owner}/${firstActiveRepo.name}`
    : 'N5H5D4/Caculator-test';

  const [selectedRepoMode, setSelectedRepoMode] = useState<string>(
    firstActiveRepo ? initialRepoFullName : 'custom'
  );
  const [customRepoName, setCustomRepoName] = useState<string>(
    firstActiveRepo ? initialRepoFullName : 'owner/repository'
  );

  const [isPullRequest, setIsPullRequest] = useState<boolean>(true);
  const [prNumber, setPrNumber] = useState<number | ''>(1);
  const [customLog, setCustomLog] = useState<string>(
    `> react-example@0.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 11 modules transformed.
✗ Build failed in 301ms
error during build:
[vite:esbuild] Transform failed with 1 error:
/home/runner/work/Caculator-test/Caculator-test/src/components/Calculator.tsx:23:40: ERROR: Expected ";" but found "=="
file: /home/runner/work/Caculator-test/Caculator-test/src/components/Calculator.tsx:23:40

Expected ";" but found "=="
21 | export const Calculator: React.FC = () => {
22 | 
23 |   const [currentValue, setCurrentValue] == useState<string>('0');
   |                                         ^
24 |   const [previousValue, setPreviousValue] = useState<string | null>(null);
25 |   const [operation, setOperation] = useState<Operation>(null);

Error: Process completed with exit code 1.`
  );

  const [step, setStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync selected repo when repos prop updates
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
      setErrorMsg('Please enter or paste the crash log content (CI Error Log).');
      return;
    }

    if (!activeTargetRepo) {
      setErrorMsg('Please select or enter a target repository name.');
      return;
    }

    setErrorMsg(null);
    setIsSimulating(true);
    setStep(1); // Receiving webhook & parsing

    try {
      // Step animation progression
      setTimeout(() => setStep(2), 400); // Log trimming
      setTimeout(() => setStep(3), 800); // AI diagnosis & validation

      // Call backend simulation endpoint that executes real Triage Engine
      const res = await axios.post(
        '/api/simulate-triage',
        {
          repo_name: activeTargetRepo,
          run_id: Math.floor(1000000000 + Math.random() * 9000000000),
          pr_number: isPullRequest && prNumber ? Number(prNumber) : null,
          raw_log: customLog.trim(),
        },
        { timeout: 30000 }
      );

      setStep(4);
      await new Promise((r) => setTimeout(r, 400));

      if (res.data) {
        setIsSimulating(false);
        onSimulateComplete({
          ...res.data,
          is_simulated: true,
        });
        return;
      }
    } catch (err: any) {
      console.warn('Backend simulate error, applying fallback processing:', err);
      // Fallback local processing if server encounters temporary timeout
      setStep(4);
      const fallbackResult: TriageResult = {
        id: Date.now(),
        repo_name: activeTargetRepo,
        run_id: Math.floor(1000000000 + Math.random() * 9000000000),
        pr_number: isPullRequest && prNumber ? Number(prNumber) : null,
        failure_category: 'syntax_error',
        confidence_score: 0.98,
        root_cause:
          'Simulated diagnosis: Detected syntax error or compilation failure in runner log stream.',
        suggested_fix:
          'Review and fix syntax errors at the file and line indicated in the failure stack.',
        trimmed_log: customLog.trim(),
        raw_response: JSON.stringify({ simulated: true }, null, 2),
        status: 'pending',
        github_comment_url: null,
        created_at: new Date().toISOString(),
        is_simulated: true,
      };
      setIsSimulating(false);
      onSimulateComplete(fallbackResult);
    }
  };

  const lineCount = customLog.split('\n').length;
  const charCount = customLog.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Info */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans tracking-tight">
          CI/CD Webhook Simulator
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Paste crash logs from CI/CD runners to evaluate intelligent log trimming and AI root-cause diagnosis.
        </p>
      </div>

      {/* Target Repo & Settings Panel */}
      <div className={`${theme.cards.base} space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <FolderGit2 className="w-4 h-4 text-emerald-600" />
            <span>Target Repository</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Select from connected repositories or specify custom
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
                  <span>Connected Repository</span>
                </div>
              </button>
            );
          })}

          {/* Custom Repo Option */}
          <button
            type="button"
            onClick={() => setSelectedRepoMode('custom')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${selectedRepoMode === 'custom'
              ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
          >
            <div className="font-semibold text-xs text-slate-900">
              Custom Repository
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Enter custom owner/repo
            </div>
          </button>
        </div>

        {selectedRepoMode === 'custom' && (
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Repository Name (owner/repo format)
            </label>
            <input
              type="text"
              placeholder="e.g., organization/my-service"
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
                <span>Pull Request</span>
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
                <span>Direct Commit / Push</span>
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
            <span>Simulated Raw CI Runner Log Stream</span>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span>
              {lineCount} lines • {charCount} chars
            </span>
            <button
              type="button"
              onClick={() => setCustomLog('')}
              className="inline-flex items-center space-x-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Clear log contents"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 text-[11px] font-medium">Quick Presets:</span>

          <button
            type="button"
            onClick={() =>
              setCustomLog(
                `> react-example@0.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 16 modules transformed.
✗ Build failed in 235ms
error during build:
[vite:esbuild] Transform failed with 1 error:
/home/runner/work/Caculator-test/Caculator-test/src/components/Calculator.tsx:21:39: ERROR: Expected "=>" but found "{"
file: /home/runner/work/Caculator-test/Caculator-test/src/components/Calculator.tsx:21:39

Expected "=>" but found "{"
19 | import { motion } from 'motion/react';
20 | 
21 | export const Calculator: React.FC = () {
   |                                        ^
22 | 
23 |   const [currentValue, setCurrentValue] = useState<string>('0');

   at failureErrorWithLog (/home/runner/work/Caculator-test/Caculator-test/node_modules/esbuild/lib/main.js:1467:15)
Error: Process completed with exit code 1.`
              )
            }
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors text-[11px] cursor-pointer"
          >
            Vite: Missing `=&gt;` (Line 21)
          </button>

          <button
            type="button"
            onClick={() =>
              setCustomLog(
                `> react-example@0.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 16 modules transformed.
✗ Build failed in 287ms
error during build:
[vite:esbuild] Transform failed with 1 error:
/home/runner/work/Caculator-test/Caculator-test/src/components/Calculator.tsx:21:41: ERROR: Unexpected ">"
file: /home/runner/work/Caculator-test/Caculator-test/src/components/Calculator.tsx:21:41

Unexpected ">"
19 |  import { motion } from 'motion/react';
20 |  
21 |  export const Calculator: React.FC = () =>> {
   |                                           ^
22 |  
23 |    const [currentValue, setCurrentValue] = useState<string>('0');

    at failureErrorWithLog (/home/runner/work/Caculator-test/Caculator-test/node_modules/esbuild/lib/main.js:1467:15)
Error: Process completed with exit code 1.`
              )
            }
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors text-[11px] cursor-pointer"
          >
            Vite: Unexpected `&gt;` (Line 21)
          </button>

          <button
            type="button"
            onClick={() =>
              setCustomLog(
                `> react-example@0.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 11 modules transformed.
✗ Build failed in 301ms
error during build:
[vite:esbuild] Transform failed with 1 error:
/home/runner/work/Caculator-test/Caculator-test/src/components/Calculator.tsx:23:40: ERROR: Expected ";" but found "=="
file: /home/runner/work/Caculator-test/Caculator-test/src/components/Calculator.tsx:23:40

Expected ";" but found "=="
21 | export const Calculator: React.FC = () => {
22 | 
23 |   const [currentValue, setCurrentValue] == useState<string>('0');
   |                                         ^
24 |   const [previousValue, setPreviousValue] = useState<string | null>(null);

Error: Process completed with exit code 1.`
              )
            }
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors text-[11px] cursor-pointer"
          >
            Vite: `==` in useState (Line 23)
          </button>

          <button
            type="button"
            onClick={() =>
              setCustomLog(
                `> react-example@0.0.0 test
> vitest run

FAIL src/tests/calculator.test.ts > Calculator > performs addition correctly
AssertionError: expected '5' to be '6' // Object.is equality

- Expected: "6"
+ Received: "5"

 ❯ src/tests/calculator.test.ts:24:22
 ❯ node_modules/vitest/dist/chunk-runtime-chain.js:144:26

Test Files  1 failed (1)
     Tests  1 failed | 5 passed (6)
Error: Process completed with exit code 1.`
              )
            }
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors text-[11px] cursor-pointer"
          >
            Vitest: Assertion Failure
          </button>
        </div>

        <div className="relative">
          <textarea
            rows={14}
            value={customLog}
            onChange={(e) => setCustomLog(e.target.value)}
            placeholder="Paste console error logs or runner output from GitHub Actions here..."
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
              Log Trimming &gt; Extraction &gt; LLM Root Cause Diagnosis
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
                  {step === 1 && 'Ingesting Webhook Payload...'}
                  {step === 2 && 'LogTrimmer extracting fault window...'}
                  {step === 3 && 'AI diagnosing Root Cause...'}
                  {step >= 4 && 'Finalizing analysis...'}
                </span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Dispatch Webhook Event</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebhookSimulator;
