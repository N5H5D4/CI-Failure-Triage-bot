import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Key,
  Layers,
  Save,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Check,
  XCircle,
} from 'lucide-react';
import { SystemSettings } from '../types';
import { theme } from '../styles/theme';

interface SettingsProps {
  settings: SystemSettings;
  onSave: (newSettings: SystemSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenTestResult, setTokenTestResult] = useState<{
    valid: boolean;
    message: string;
    user?: string;
    scopes?: string;
  } | null>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestGitHubToken = async () => {
    setIsTestingToken(true);
    setTokenTestResult(null);
    try {
      const res = await axios.post('/api/settings/test-github-token', {
        token: formData.github_token,
      });
      setTokenTestResult(res.data);
    } catch (err: any) {
      setTokenTestResult({
        valid: false,
        message:
          err.response?.data?.message ||
          'Unable to connect to the server to verify the token.',
      });
    } finally {
      setIsTestingToken(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
          System & Clean Architecture Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Configure diagnostic LLM models, GitHub API tokens, and log trimming thresholds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Architecture Verification Card */}
        <div className={`${theme.cards.base} space-y-4`}>
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Clean Architecture Layers Health
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                Presentation Layer
              </div>
              <div className="font-semibold text-slate-900">Controllers</div>
              <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>FastAPI Webhooks</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                Application Layer
              </div>
              <div className="font-semibold text-slate-900">Services</div>
              <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>LogTrimmer + Triage</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                Infrastructure Layer
              </div>
              <div className="font-semibold text-slate-900">Adapters</div>
              <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>GitHub & Claude SDK</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                Persistence Layer
              </div>
              <div className="font-semibold text-slate-900">Data Models</div>
              <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>SQLAlchemy SQLite</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Credentials Card */}
        <div className={`${theme.cards.base} space-y-4`}>
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Key className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              API Keys & Authentication
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label
                htmlFor="claude-key-input"
                className="block text-slate-700 font-medium mb-1"
              >
                Anthropic Claude API Key
              </label>
              <input
                id="claude-key-input"
                type="password"
                placeholder="sk-ant-api03-..."
                value={formData.claude_api_key || ''}
                onChange={(e) =>
                  setFormData({ ...formData, claude_api_key: e.target.value })
                }
                className={theme.inputs.base}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Utilized by `claude_client.py` for structured JSON schema failure diagnostics.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="github-token-input"
                  className="block text-slate-700 font-medium"
                >
                  GitHub Personal Access Token (PAT)
                </label>
                <button
                  type="button"
                  onClick={handleTestGitHubToken}
                  disabled={isTestingToken}
                  className={theme.buttons.secondary}
                >
                  {isTestingToken ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Testing Token...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Test Token Connection</span>
                    </>
                  )}
                </button>
              </div>
              <input
                id="github-token-input"
                type="password"
                placeholder="github_pat_... or ghp_..."
                value={formData.github_token || ''}
                onChange={(e) => {
                  setFormData({ ...formData, github_token: e.target.value });
                  setTokenTestResult(null);
                }}
                className={theme.inputs.base}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Supports both Fine-grained tokens (<code>github_pat_...</code>) and Classic tokens (<code>ghp_...</code>).
              </span>

              {tokenTestResult && (
                <div
                  className={`mt-2.5 p-3 rounded-lg border text-xs flex items-start space-x-2 ${tokenTestResult.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                  {tokenTestResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-semibold">
                      {tokenTestResult.valid
                        ? `Token is valid & active (User: ${tokenTestResult.user || 'Fine-grained'})`
                        : 'Token verification failed'}
                    </div>
                    <div className="text-[11px] opacity-90 leading-relaxed">
                      {tokenTestResult.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostic Tuning Parameters */}
        <div className={`${theme.cards.base} space-y-4`}>
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Pipeline & Log Trimmer Tuning
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label
                htmlFor="max-tokens-input"
                className="block text-slate-700 font-medium mb-1"
              >
                Max Log Window Tokens
              </label>
              <input
                id="max-tokens-input"
                type="number"
                value={formData.max_log_tokens}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_log_tokens: Number(e.target.value),
                  })
                }
                className={theme.inputs.base}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Target token budget for `log_trimmer.py` before sending to Claude.
              </span>
            </div>

            <div>
              <label
                htmlFor="rate-limit-input"
                className="block text-slate-700 font-medium mb-1"
              >
                Max Requests / Minute (Rate Limit)
              </label>
              <input
                id="rate-limit-input"
                type="number"
                value={formData.rate_limit_per_min}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rate_limit_per_min: Number(e.target.value),
                  })
                }
                className={theme.inputs.base}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Prevents webhook congestion during multi-matrix CI executions.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.debug_mode}
                onChange={(e) =>
                  setFormData({ ...formData, debug_mode: e.target.checked })
                }
                className="rounded bg-white border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Enable Verbose Debug Logs in Console</span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings saved successfully!</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">
              Changes will take effect immediately for the triage dispatcher.
            </span>
          )}

          <button
            id="save-settings-btn"
            type="submit"
            className={theme.buttons.primary}
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
