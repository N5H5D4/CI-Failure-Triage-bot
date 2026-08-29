// frontend/src/pages/ConnectRepo.jsx
import React, { useState } from 'react';
import { GitBranch, Copy, Check, CheckCircle2, AlertTriangle, ArrowRight, Server } from 'lucide-react';
import axios from 'axios';

export default function ConnectRepo({ onRepoConnected, onNavigate }) {
  const [repoInput, setRepoInput] = useState('octocat/auth-service');
  const [secret, setSecret] = useState('ci_bot_sec_' + Math.random().toString(36).substring(2, 10));
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { success: true, message: '' }
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const endpointUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/webhook`
    : 'https://ci-triage-bot.onrender.com/webhook';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await axios.post('/api/repos/test-connection', { secret });
      setTestStatus({
        success: true,
        message: res.data.message || 'Signature validated! Webhook is receiving signals properly.'
      });
    } catch (err) {
      setTestStatus({
        success: false,
        message: err.response?.data?.detail || 'Connection test failed. Check endpoint reachability.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndEnable = async (e) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    setSaving(true);
    try {
      const parts = repoInput.split('/');
      const owner = parts[0] || 'default-owner';
      const name = parts[1] || repoInput;

      await axios.post('/api/repos', {
        owner,
        name,
        webhook_secret: secret,
        is_active: true
      });

      if (onRepoConnected) {
        onRepoConnected({ owner, name });
      }
      onNavigate('dashboard');
    } catch (err) {
      alert('Error saving repository config: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-zinc-800">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 font-sans tracking-tight">Connect a Repository</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure your GitHub repository webhook to dispatch failed CI logs directly to this bot.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAndEnable} className="space-y-6">
          {/* Repository Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              GitHub Repository (owner/repo)
            </label>
            <input
              type="text"
              required
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="e.g. facebook/react or octocat/auth-service"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 font-mono text-sm focus:outline-none focus:border-indigo-500 bg-zinc-950 text-zinc-100 placeholder-zinc-600"
            />
            <p className="text-[11px] text-zinc-500 mt-1.5">
              The GitHub organization/user and repository name to monitor for CI failure events.
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                Webhook Secret (HMAC-SHA256)
              </label>
              <button
                type="button"
                onClick={() => setSecret('ci_sec_' + Math.random().toString(36).substring(2, 12))}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Regenerate Secret
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 font-mono text-sm focus:outline-none focus:border-indigo-500 bg-zinc-950 text-zinc-100"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Secret used to cryptographically verify X-Hub-Signature-256 header signatures.
            </p>
          </div>

          {/* Webhook Endpoint URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Payload URL (Add this in GitHub Settings → Webhooks)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={endpointUrl}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 font-mono text-xs bg-zinc-950 text-zinc-300 select-all"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex items-center space-x-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold shadow-sm transition border border-zinc-700"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Test Status Banner */}
          {testStatus && (
            <div
              className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 ${
                testStatus.success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition shadow-sm"
            >
              {testing ? 'Testing Signature...' : 'Test Connection'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/40 transition"
            >
              <span>{saving ? 'Enabling...' : 'Save and Enable'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Instructions Card */}
      <div className="mt-6 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs space-y-2">
        <h4 className="font-bold text-zinc-100 flex items-center space-x-1.5">
          <Server className="w-4 h-4 text-indigo-400" />
          <span>GitHub Webhook Setup Checklist:</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-zinc-400 leading-relaxed">
          <li>Go to your GitHub repository → <strong>Settings</strong> → <strong>Webhooks</strong> → <strong>Add webhook</strong>.</li>
          <li>Paste the <strong>Payload URL</strong> above into GitHub.</li>
          <li>Choose <strong>Content type:</strong> <code className="bg-zinc-950 px-1 py-0.5 rounded text-indigo-300 border border-zinc-800">application/json</code>.</li>
          <li>Enter your <strong>Secret</strong> into the Secret field.</li>
          <li>Select <strong>Let me select individual events</strong> and check <strong>Workflow runs</strong>.</li>
          <li>Save and ensure the green checkmark appears on GitHub!</li>
        </ol>
      </div>
    </div>
  );
}
