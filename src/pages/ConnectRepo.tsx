import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Trash2,
  Power,
  Shield,
  Clock,
  Terminal,
  Info,
} from 'lucide-react';
import { RepositoryConfig } from '../types';
import { theme } from '../styles/theme';
import { formatGMT7 } from '../utils/date';

interface ConnectRepoProps {
  repos: RepositoryConfig[];
  onAddRepo: (owner: string, name: string) => void;
  onToggleActive: (id: number, currentActive: boolean) => void;
  onDeleteRepo: (id: number) => void;
}

export const ConnectRepo: React.FC<ConnectRepoProps> = ({
  repos,
  onAddRepo,
  onToggleActive,
  onDeleteRepo,
}) => {
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim() || !name.trim()) {
      setError('Owner and repository name are required.');
      return;
    }
    setError(null);
    onAddRepo(owner.trim(), name.trim());
    setOwner('');
    setName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans tracking-tight">
          Monitored Repositories
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Configure GitHub repositories receiving automated triage bot diagnosis and PR feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Repo Form */}
        <div className="lg:col-span-1">
          <div className={`${theme.cards.base} space-y-4`}>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
              <Plus className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Connect New Repository
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Owner / Organization
                </label>
                <input
                  id="repo-owner-input"
                  type="text"
                  placeholder="e.g., facebook or my-org"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className={theme.inputs.base}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Repository Name
                </label>
                <input
                  id="repo-name-input"
                  type="text"
                  placeholder="e.g., react or backend-service"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={theme.inputs.base}
                />
              </div>

              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <button
                id="add-repo-submit-btn"
                type="submit"
                className={`w-full ${theme.buttons.primary}`}
              >
                <FolderGit2 className="w-4 h-4" />
                <span>Track Repository</span>
              </button>
            </form>
          </div>

          {/* Webhook Secret Setup Guide */}
          <div className="mt-4 p-4 bg-slate-100/80 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 font-semibold">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>GitHub Webhook Configuration</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              In your GitHub Repository Settings &gt; Webhooks, point the Payload URL to:
            </p>
            <div className="p-2 bg-white rounded border border-slate-300 font-mono text-[11px] text-emerald-800 break-all select-all font-semibold shadow-xs">
              https://your-domain.app/api/webhook/github
            </div>
            <p className="text-[11px] text-slate-500">
              Select event: <strong>Workflow runs</strong> (workflow_run).
            </p>
          </div>
        </div>

        {/* Repositories List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <span>Connected Repositories</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {repos.length}
              </span>
            </h2>
          </div>

          {repos.length === 0 ? (
            <div className={`${theme.cards.base} py-12 text-center text-slate-500`}>
              <FolderGit2 className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No repositories connected yet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Add a repository above to start automated failure monitoring.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  id={`repo-card-${repo.id}`}
                  className={`${theme.cards.base} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <FolderGit2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-900 text-sm">
                        {repo.owner} / {repo.name}
                      </span>
                      {repo.is_active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Monitoring
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Paused
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-sans">
                      <div className="flex items-center space-x-1">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>Webhook Secret Protected</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Added: {formatGMT7(repo.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      id={`toggle-repo-btn-${repo.id}`}
                      onClick={() => onToggleActive(repo.id, repo.is_active)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${repo.is_active
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                        }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{repo.is_active ? 'Active' : 'Enable'}</span>
                    </button>

                    <button
                      id={`delete-repo-btn-${repo.id}`}
                      onClick={() => onDeleteRepo(repo.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shadow-xs"
                      title="Disconnect repository"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectRepo;
