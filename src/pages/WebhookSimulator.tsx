import React, { useState } from 'react';
import {
  Play,
  CheckCircle,
  AlertCircle,
  Terminal,
  Sparkles,
  GitPullRequest,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { TriageResult } from '../types';

interface WebhookSimulatorProps {
  onSimulateComplete: (newResult: TriageResult) => void;
}

const PRESET_SCENARIOS = [
  {
    name: 'Dependency Conflict (pip / urllib3)',
    repo: 'octocat/auth-service',
    runId: 91402,
    prNumber: 130,
    category: 'dependency_issue',
    log: `[info] Step: Install dependencies
Collecting requests==2.31.0
ERROR: Cannot install -r requirements.txt (line 14) and urllib3==2.2.1 because these package versions have conflicting dependencies.
The conflict is caused by:
    requests 2.31.0 depends on urllib3<3,>=1.21.1
    The user requested urllib3==2.2.1
To fix this conflict, pin urllib3<2.2.0 or upgrade requests.
##[error]Process completed with exit code 1.`,
    rootCause:
      'Dependency conflict between `requests==2.31.0` and `urllib3==2.2.1` specified in requirements.txt (line 14).',
    suggestedFix:
      'Pin `urllib3<2.2.0` or upgrade `requests` to `>=2.32.0` in `requirements.txt`.',
    confidence: 0.96,
  },
  {
    name: 'TypeScript Compilation & Syntax Error',
    repo: 'HCMUS/shopping-cart',
    runId: 91405,
    prNumber: 99,
    category: 'syntax_error',
    log: `[info] Step: Build & Compile
src/cart/calculator.ts(42,18): error TS2339: Property 'discountRate' does not exist on type 'CartItem'.
src/cart/calculator.ts(55,5): error TS1005: ',' expected.
[error] Found 2 TypeScript compilation errors in src/cart/calculator.ts
##[error]Process completed with exit code 2.`,
    rootCause:
      'TypeScript compilation failed in `src/cart/calculator.ts` at line 42: Property `discountRate` does not exist on type `CartItem`.',
    suggestedFix:
      'Add `discountRate?: number;` to the `CartItem` interface in `src/types/cart.ts` and fix missing comma on line 55.',
    confidence: 0.98,
  },
  {
    name: 'Pytest Unit Test Assertion Failure',
    repo: 'HCMUS/weather-app',
    runId: 91408,
    prNumber: 64,
    category: 'test_failure',
    log: `============================= test session starts ==============================
tests/test_converter.py ...F.............. [100%]
=================================== FAILURES ===================================
___________________________ test_celsius_to_fahrenheit ___________________________
    def test_celsius_to_fahrenheit():
>       assert convert_c_to_f(37.0) == 98.6
E       AssertionError: assert 98.0 == 98.6
tests/test_converter.py:24: AssertionError
=========================== 1 failed, 17 passed in 1.42s ===========================
##[error]Process completed with exit code 1.`,
    rootCause:
      'Unit test `test_celsius_to_fahrenheit` failed assertion: expected `98.6`, received `98.0` due to integer division in `math_utils.py`.',
    suggestedFix:
      'Replace integer division `temp * (9 // 5) + 32` with float division `temp * (9 / 5) + 32` in `src/utils/converter.py`.',
    confidence: 0.97,
  },
];

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({
  onSimulateComplete,
}) => {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [repoName, setRepoName] = useState(PRESET_SCENARIOS[0].repo);
  const [runId, setRunId] = useState(PRESET_SCENARIOS[0].runId);
  const [prNumber, setPrNumber] = useState<number | ''>(PRESET_SCENARIOS[0].prNumber);
  const [customLog, setCustomLog] = useState(PRESET_SCENARIOS[0].log);

  const [step, setStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedResult, setSimulatedResult] = useState<TriageResult | null>(
    null
  );

  const handleSelectPreset = (idx: number) => {
    setSelectedScenarioIndex(idx);
    const s = PRESET_SCENARIOS[idx];
    setRepoName(s.repo);
    setRunId(s.runId + Math.floor(Math.random() * 50));
    setPrNumber(s.prNumber);
    setCustomLog(s.log);
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulatedResult(null);
    setStep(1); // Receiving webhook

    await new Promise((r) => setTimeout(r, 600));
    setStep(2); // Ingesting and trimming logs

    await new Promise((r) => setTimeout(r, 700));
    setStep(3); // Claude 3.5 Sonnet analysis

    await new Promise((r) => setTimeout(r, 800));
    setStep(4); // Response validation & Markdown generation

    await new Promise((r) => setTimeout(r, 500));
    setStep(5); // Complete

    const scenario = PRESET_SCENARIOS[selectedScenarioIndex];
    const newRun: TriageResult = {
      id: Date.now(),
      repo_name: repoName,
      run_id: Number(runId),
      pr_number: prNumber ? Number(prNumber) : null,
      failure_category: scenario ? scenario.category : 'build_failure',
      confidence_score: scenario ? scenario.confidence : 0.95,
      root_cause: scenario
        ? scenario.rootCause
        : 'CI build step exited with non-zero exit code.',
      suggested_fix: scenario
        ? scenario.suggestedFix
        : 'Check the error log trace above.',
      trimmed_log: customLog,
      raw_response: JSON.stringify(
        {
          failure_category: scenario ? scenario.category : 'build_failure',
          confidence_score: scenario ? scenario.confidence : 0.95,
          root_cause: scenario ? scenario.rootCause : 'Error in CI step',
          suggested_fix: scenario ? scenario.suggestedFix : 'Apply patch',
        },
        null,
        2
      ),
      status: 'posted',
      github_comment_url: prNumber
        ? `https://github.com/${repoName}/pull/${prNumber}#issuecomment-${Date.now()}`
        : null,
      created_at: new Date().toISOString(),
    };

    setSimulatedResult(newRun);
    setIsSimulating(false);
    onSimulateComplete(newRun);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 font-sans">
          GitHub Actions Webhook Simulator
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Trigger simulated `workflow_run.completed` events to test Claude 3.5 Sonnet log trimming and diagnostic accuracy in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preset Selector & Input Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Choose Test Preset Scenario
            </h2>

            <div className="space-y-2">
              {PRESET_SCENARIOS.map((scenario, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(idx)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                    selectedScenarioIndex === idx
                      ? 'bg-indigo-950/40 border-indigo-500/50 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <div className="font-semibold text-zinc-200">
                    {scenario.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {scenario.repo} (PR #{scenario.prNumber})
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  Target Repository
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    Workflow Run ID
                  </label>
                  <input
                    type="number"
                    value={runId}
                    onChange={(e) => setRunId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">
                    PR Number
                  </label>
                  <input
                    type="number"
                    value={prNumber}
                    onChange={(e) =>
                      setPrNumber(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <button
                id="run-simulation-btn"
                onClick={runSimulation}
                disabled={isSimulating}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-sm transition-colors flex items-center justify-center space-x-2"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Pipeline...</span>
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

        {/* Log Editor & Realtime Pipeline Trace */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Simulated Raw CI Runner Log Stream</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Editable Payload
              </span>
            </div>

            <textarea
              rows={8}
              value={customLog}
              onChange={(e) => setCustomLog(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-black text-zinc-300 border border-zinc-800 rounded-lg focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Stepper Pipeline Status */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Triage Pipeline Execution Trace
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div
                className={`p-3 rounded-lg border transition-all ${
                  step >= 1
                    ? 'bg-indigo-950/30 border-indigo-500/40 text-zinc-200'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Webhook</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  HMAC verify & parse
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border transition-all ${
                  step >= 2
                    ? 'bg-indigo-950/30 border-indigo-500/40 text-zinc-200'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>LogTrimmer</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Extract error context
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border transition-all ${
                  step >= 3
                    ? 'bg-indigo-950/30 border-indigo-500/40 text-zinc-200'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>Claude 3.5</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Root-cause diagnosis
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border transition-all ${
                  step >= 5
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : step >= 4
                    ? 'bg-indigo-950/30 border-indigo-500/40 text-zinc-200'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-[10px]">
                    4
                  </span>
                  <span>PR Comment</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Markdown analysis
                </p>
              </div>
            </div>

            {simulatedResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>
                    Analysis successfully generated & added to triage stream!
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebhookSimulator;
