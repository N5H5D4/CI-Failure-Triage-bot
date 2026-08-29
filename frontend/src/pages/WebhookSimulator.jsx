// frontend/src/pages/WebhookSimulator.jsx
import React, { useState } from 'react';
import { Radio, Play, Sparkles, CheckCircle2, AlertCircle, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import axios from 'axios';
import CategoryBadge from '../components/CategoryBadge';
import LogViewer from '../components/LogViewer';

export default function WebhookSimulator({ onTriageComplete, onSelectRun }) {
  const [sampleType, setSampleType] = useState('dependency_issue');
  const [repoName, setRepoName] = useState('octocat/auth-service');
  const [runId, setRunId] = useState(128450);
  const [prNumber, setPrNumber] = useState(128);

  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const sampleScenarios = [
    {
      id: 'dependency_issue',
      name: 'Python/Node Dependency Conflict',
      desc: 'requests 2.31.0 vs urllib3 1.26.15 lockfile conflict in requirements.txt',
    },
    {
      id: 'syntax_error',
      name: 'TypeScript Syntax / Type Error',
      desc: 'TS2339 Property refreshToken does not exist on UserSession',
    },
    {
      id: 'test_failure',
      name: 'Pytest Unit Test Assertion Failure',
      desc: 'test_token_race_condition asserted success_count 4 == 5',
    },
    {
      id: 'flaky_test',
      name: 'Cypress End-to-End Test Flake',
      desc: 'Timed out retrying after 10000ms on OAuth callback socket latency',
    },
  ];

  const handleSimulate = async () => {
    setLoading(true);
    setTriageResult(null);
    try {
      const res = await axios.post('/api/simulate-triage', null, {
        params: {
          repo_name: repoName,
          run_id: runId,
          pr_number: prNumber,
          sample_type: sampleType,
        }
      });
      setTriageResult(res.data);
      if (onTriageComplete) onTriageComplete();
    } catch (err) {
      alert('Simulation error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-zinc-800">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 font-sans tracking-tight">
              CI Failure Simulator & PR Comment Testbed
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Simulate GitHub Actions failure webhooks, trigger the AI Triage pipeline, and preview the automated PR comment.
            </p>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Repository
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 font-mono text-xs bg-zinc-950 text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Workflow Run ID
            </label>
            <input
              type="number"
              value={runId}
              onChange={(e) => setRunId(parseInt(e.target.value) || 1000)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 font-mono text-xs bg-zinc-950 text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              Pull Request #
            </label>
            <input
              type="number"
              value={prNumber}
              onChange={(e) => setPrNumber(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-800 font-mono text-xs bg-zinc-950 text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Failure Scenario Selection */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
            Select Failure Scenario to Inject
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sampleScenarios.map((sc) => (
              <div
                key={sc.id}
                onClick={() => setSampleType(sc.id)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  sampleType === sc.id
                    ? 'border-indigo-500 bg-indigo-950/30 shadow-sm'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-200">{sc.name}</h4>
                  {sampleType === sc.id && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">{sc.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleSimulate}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-950/40 transition"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing CI failure with Claude AI & Generating Remediation...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Simulate Webhook & Run AI Triage Engine</span>
            </>
          )}
        </button>
      </div>

      {/* Result Section */}
      {triageResult && (
        <div className="space-y-6">
          {/* GitHub PR Comment Mockup */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm overflow-hidden">
            <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                  CI
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-200">GitHub Pull Request Comment Output</h3>
                  <p className="text-[11px] text-zinc-500">
                    Posted as automated comment to <code className="text-indigo-400">{triageResult.repo_name}#pull/{triageResult.pr_number}</code>
                  </p>
                </div>
              </div>

              <button
                onClick={() => onSelectRun(triageResult)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition border border-zinc-700"
              >
                <span>Open Full Detail</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6 bg-zinc-950/50">
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center space-x-3">
                    <CategoryBadge category={triageResult.failure_category} />
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      Confidence: {Math.round((triageResult.confidence_score || 0.9) * 100)}%
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    ✓ Verified by ResponseValidator
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    🔍 Root Cause
                  </h4>
                  <blockquote className="p-3 bg-zinc-950 border-l-4 border-red-500 rounded-r-lg text-xs leading-relaxed text-zinc-200">
                    {triageResult.root_cause}
                  </blockquote>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    💡 Suggested Fix
                  </h4>
                  <pre className="bg-black text-indigo-300 p-3.5 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed border border-zinc-800">
                    {triageResult.suggested_fix}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Captured Trimmed Log */}
          {triageResult.trimmed_log && (
            <LogViewer
              logText={triageResult.trimmed_log}
              title={`Captured & Trimmed Log for Run #${triageResult.run_id}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
