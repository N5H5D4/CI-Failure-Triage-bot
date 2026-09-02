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
  Eye,
  EyeOff,
  HelpCircle,
  AlertTriangle,
  Cpu,
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
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenTestResult, setTokenTestResult] = useState<{
    valid: boolean;
    message: string;
    user?: string;
    scopes?: string;
  } | null>(null);

  const [isTestingClaude, setIsTestingClaude] = useState(false);
  const [claudeTestResult, setClaudeTestResult] = useState<{
    valid: boolean;
    message: string;
    model?: string;
    fallback_available?: boolean;
    fallback_engine?: string;
  } | null>(null);

  const [isTestingGroq, setIsTestingGroq] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{
    valid: boolean;
    message: string;
    model?: string;
  } | null>(null);

  useEffect(() => {
    setFormData((prev) => ({
      ...settings,
      groq_api_key: prev.groq_api_key && !prev.groq_api_key.includes('...') ? prev.groq_api_key : settings.groq_api_key,
      claude_api_key: prev.claude_api_key && !prev.claude_api_key.includes('...') ? prev.claude_api_key : settings.claude_api_key,
      github_token: prev.github_token && !prev.github_token.includes('...') ? prev.github_token : settings.github_token,
      webhook_secret: prev.webhook_secret && !prev.webhook_secret.includes('...') ? prev.webhook_secret : settings.webhook_secret,
    }));
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 4000);
  };

  const handleTestClaudeKey = async () => {
    setIsTestingClaude(true);
    setClaudeTestResult(null);
    try {
      const res = await axios.post('/api/settings/test-claude-key', {
        apiKey: formData.claude_api_key,
      });
      setClaudeTestResult(res.data);
      if (res.data?.valid) {
        onSave(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 4000);
      }
    } catch (err: any) {
      setClaudeTestResult({
        valid: false,
        message:
          err.response?.data?.message ||
          err.message ||
          'Unable to connect to Anthropic API to verify API key.',
        fallback_available: true,
        fallback_engine: 'Groq (llama-3.3-70b-versatile)',
      });
    } finally {
      setIsTestingClaude(false);
    }
  };

  const handleTestGroqKey = async () => {
    setIsTestingGroq(true);
    setGroqTestResult(null);
    try {
      let res;
      try {
        res = await axios.post('/api/settings/test-groq-key', {
          apiKey: formData.groq_api_key,
        });
      } catch (firstErr: any) {
        if (firstErr.response?.status === 404) {
          // Retry with fallback alias
          res = await axios.post('/api/test-groq-key', {
            apiKey: formData.groq_api_key,
          });
        } else {
          throw firstErr;
        }
      }

      setGroqTestResult(res.data);
      if (res.data?.valid) {
        onSave(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 4000);
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.message;
      let displayMessage = serverMessage || err.message || 'Không thể kết nối đến Groq Engine.';
      if (err.response?.status === 404) {
        displayMessage = 'Endpoint kiểm tra Groq API chưa phản hồi (404). Vui lòng tải lại trang hoặc kiểm tra kết nối.';
      } else if (!formData.groq_api_key) {
        displayMessage = serverMessage || 'Vui lòng dán khóa Groq API Key (bắt đầu bằng gsk_...) vào ô nhập phía trên trước khi bấm kiểm tra.';
      }
      setGroqTestResult({
        valid: false,
        message: displayMessage,
      });
    } finally {
      setIsTestingGroq(false);
    }
  };

  const handleTestGitHubToken = async () => {
    setIsTestingToken(true);
    setTokenTestResult(null);
    try {
      const res = await axios.post('/api/settings/test-github-token', {
        token: formData.github_token,
      });
      setTokenTestResult(res.data);
      if (res.data?.valid) {
        onSave(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 4000);
      }
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
          Configure diagnostic Groq LLM models, GitHub API tokens, and log trimming thresholds.
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
                <span>GitHub & Groq SDK</span>
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
            {/* Groq AI Engine Primary Card */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <label htmlFor="groq-key-input" className="text-slate-800 font-semibold block">
                    Groq AI Engine (llama-3.3-70b-versatile)
                  </label>
                  {formData.groq_api_key ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                      Auto-Detect (.env)
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  {formData.groq_api_key && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, groq_api_key: '' });
                        setGroqTestResult(null);
                      }}
                      className={theme.buttons.danger}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleTestGroqKey}
                    disabled={isTestingGroq}
                    className={theme.buttons.secondary}
                  >
                    {isTestingGroq ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                        <span>Testing Groq...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-blue-600" />
                        <span>Test Groq Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  id="groq-key-input"
                  type={showGroqKey ? 'text' : 'password'}
                  placeholder="Mặc định lấy GROQ_API_KEY từ file .env (hoặc dán gsk_... để ghi đè)"
                  value={formData.groq_api_key || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, groq_api_key: e.target.value });
                    setGroqTestResult(null);
                  }}
                  className={`${theme.inputs.base} pr-9 font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showGroqKey ? 'Hide key' : 'Show key'}
                >
                  {showGroqKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Động cơ AI chính sử dụng mô hình <strong>Groq (llama-3.3-70b-versatile)</strong> với tốc độ suy luận siêu tốc độ và khả năng phân tích lỗi CI/CD chính xác cao. Hoàn toàn miễn phí key tại <strong><a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-semibold text-blue-700">console.groq.com/keys</a></strong>.
              </p>

              {groqTestResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${groqTestResult.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                  {groqTestResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5 flex-1">
                    <div className="font-semibold">
                      {groqTestResult.valid ? 'Groq AI Engine Online (llama-3.3-70b-versatile)' : 'Groq Engine Check Failed'}
                    </div>
                    <div className="text-[11px] opacity-90 leading-relaxed">{groqTestResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Anthropic Claude API Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="claude-key-input"
                    className="block text-slate-700 font-medium"
                  >
                    Anthropic Claude API Key (Secondary / Optional)
                  </label>
                  {formData.claude_api_key ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      Not Configured
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  {formData.claude_api_key && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, claude_api_key: '' });
                        setClaudeTestResult(null);
                      }}
                      className="text-[11px] text-slate-500 hover:text-rose-600 px-1.5 py-0.5 rounded border border-slate-200 hover:border-rose-200"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleTestClaudeKey}
                    disabled={isTestingClaude}
                    className={theme.buttons.secondary}
                  >
                    {isTestingClaude ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                        <span>Testing Claude...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Test Claude Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  id="claude-key-input"
                  type={showClaudeKey ? 'text' : 'password'}
                  placeholder="sk-ant-api03-..."
                  value={formData.claude_api_key || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, claude_api_key: e.target.value });
                    setClaudeTestResult(null);
                  }}
                  className={`${theme.inputs.base} pr-9 font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showClaudeKey ? 'Hide key' : 'Show key'}
                >
                  {showClaudeKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Secondary fallback model for CI diagnostics with Claude (3.5 Sonnet / Haiku).
              </span>

              {claudeTestResult && (
                <div
                  className={`mt-2.5 p-3 rounded-lg border text-xs flex items-start space-x-2 ${claudeTestResult.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                  {claudeTestResult.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <div className="font-semibold">
                      {claudeTestResult.valid
                        ? `Claude API Connected (${claudeTestResult.model || 'Claude 3.5'})`
                        : 'Claude API Verification Failed (Groq Engine Active)'}
                    </div>
                    <div className="text-[11px] opacity-90 leading-relaxed">
                      {claudeTestResult.message}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GitHub Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="github-token-input"
                    className="block text-slate-700 font-medium"
                  >
                    GitHub Personal Access Token (PAT)
                  </label>
                  {formData.github_token ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                      ✓ Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      Not Configured
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  {formData.github_token && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, github_token: '' });
                        setTokenTestResult(null);
                      }}
                      className="text-[11px] text-slate-500 hover:text-rose-600 px-1.5 py-0.5 rounded border border-slate-200 hover:border-rose-200"
                    >
                      Clear
                    </button>
                  )}
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
              </div>
              <div className="relative">
                <input
                  id="github-token-input"
                  type={showGithubToken ? 'text' : 'password'}
                  placeholder="github_pat_... or ghp_..."
                  value={formData.github_token || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, github_token: e.target.value });
                    setTokenTestResult(null);
                  }}
                  className={`${theme.inputs.base} pr-9 font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setShowGithubToken(!showGithubToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showGithubToken ? 'Hide token' : 'Show token'}
                >
                  {showGithubToken ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
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
                Target token budget for `log_trimmer.py` before sending to Groq.
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
