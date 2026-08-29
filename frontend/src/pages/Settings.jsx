// frontend/src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Cpu, Check, Save, Sliders } from 'lucide-react';
import axios from 'axios';

export default function Settings() {
  const [settings, setSettings] = useState({
    claude_api_key: '',
    github_token: '',
    webhook_secret: '',
    max_log_tokens: 3000,
    rate_limit_per_min: 60,
    debug_mode: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/settings', settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-zinc-800">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 font-sans tracking-tight">System Settings</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage LLM provider credentials, trimming bounds, and global rate limits.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: LLM Provider */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                LLM Provider Configuration
              </h2>
            </div>

            <div className="space-y-4 bg-zinc-950 p-5 rounded-xl border border-zinc-800">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Provider Model
                </label>
                <div className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center justify-between">
                  <span>Anthropic Claude 3 / 3.5 Sonnet & Haiku</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/20">
                    Active
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Anthropic API Key (<code className="font-mono text-indigo-400">CLAUDE_API_KEY</code>)
                </label>
                <input
                  type="password"
                  value={settings.claude_api_key || ''}
                  onChange={(e) => setSettings({ ...settings, claude_api_key: e.target.value })}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 font-mono text-xs bg-zinc-900 text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Your Anthropic API key is securely used server-side to execute structured log analysis prompts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  GitHub Personal Access Token (<code className="font-mono text-indigo-400">GITHUB_TOKEN</code>)
                </label>
                <input
                  type="password"
                  value={settings.github_token || ''}
                  onChange={(e) => setSettings({ ...settings, github_token: e.target.value })}
                  placeholder="ghp_..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 font-mono text-xs bg-zinc-900 text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Requires <code className="bg-zinc-900 px-1 py-0.5 rounded font-mono text-zinc-300">repo</code> scope or GitHub App write permissions to post PR comments.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: System Limits */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                System Limits & Trimming Bounds
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950 p-5 rounded-xl border border-zinc-800">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Max Log Size (Tokens Soft Bound)
                </label>
                <input
                  type="number"
                  min="500"
                  max="16000"
                  step="500"
                  value={settings.max_log_tokens || 3000}
                  onChange={(e) => setSettings({ ...settings, max_log_tokens: parseInt(e.target.value) || 3000 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 font-mono text-xs bg-zinc-900 text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Prevents runaway token billing on giant 10MB CI logs.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Rate Limit (Requests / min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={settings.rate_limit_per_min || 60}
                  onChange={(e) => setSettings({ ...settings, rate_limit_per_min: parseInt(e.target.value) || 60 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 font-mono text-xs bg-zinc-900 text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Defends endpoint from spam triggers during build flurries.
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            {savedSuccess ? (
              <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Settings saved and applied successfully!</span>
              </span>
            ) : <div></div>}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-950/40"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
