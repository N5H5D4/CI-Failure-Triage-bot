import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Cpu,
  Layers,
  Save,
  CheckCircle2,
  Lock,
  Database,
  Terminal,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsProps {
  settings: SystemSettings;
  onSave: (newSettings: SystemSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 font-sans">
          Bot & Clean Architecture Settings
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Manage LLM diagnostic models, GitHub API tokens, and log trimming token limits.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Architecture Verification Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Clean Architecture Modules Status
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
              <div className="text-zinc-500 uppercase tracking-wider text-[10px]">
                Presentation Layer
              </div>
              <div className="font-semibold text-zinc-200">Controllers</div>
              <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>FastAPI Webhooks</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
              <div className="text-zinc-500 uppercase tracking-wider text-[10px]">
                Application Layer
              </div>
              <div className="font-semibold text-zinc-200">Services</div>
              <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>LogTrimmer + Triage</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
              <div className="text-zinc-500 uppercase tracking-wider text-[10px]">
                Infrastructure Layer
              </div>
              <div className="font-semibold text-zinc-200">Adapters</div>
              <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>GitHub & Claude SDK</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
              <div className="text-zinc-500 uppercase tracking-wider text-[10px]">
                Persistence Layer
              </div>
              <div className="font-semibold text-zinc-200">Data Models</div>
              <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>SQLAlchemy SQLite</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Credentials Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800">
            <Key className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              API Keys & Authentication
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label
                htmlFor="claude-key-input"
                className="block text-zinc-400 font-medium mb-1"
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
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Used by `claude_client.py` for structured JSON failure diagnosis.
              </span>
            </div>

            <div>
              <label
                htmlFor="github-token-input"
                className="block text-zinc-400 font-medium mb-1"
              >
                GitHub Personal Access Token (PAT)
              </label>
              <input
                id="github-token-input"
                type="password"
                placeholder="ghp_..."
                value={formData.github_token || ''}
                onChange={(e) =>
                  setFormData({ ...formData, github_token: e.target.value })
                }
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Required permissions: `repo`, `workflow`, `pull_requests:write`.
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostic Tuning Parameters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Pipeline & Log Trimmer Tuning
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label
                htmlFor="max-tokens-input"
                className="block text-zinc-400 font-medium mb-1"
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
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Target token count for `log_trimmer.py` before sending prompt.
              </span>
            </div>

            <div>
              <label
                htmlFor="rate-limit-input"
                className="block text-zinc-400 font-medium mb-1"
              >
                Max Requests / Minute Rate Limit
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
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Prevents webhook throttling during parallel matrix CI runs.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.debug_mode}
                onChange={(e) =>
                  setFormData({ ...formData, debug_mode: e.target.checked })
                }
                className="rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Enable Verbose Debug Logs in Console</span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuration successfully saved!</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">
              Changes apply instantly to the triage runner.
            </span>
          )}

          <button
            id="save-settings-btn"
            type="submit"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
