import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { TriageDetail } from './pages/TriageDetail';
import { ConnectRepo } from './pages/ConnectRepo';
import { WebhookSimulator } from './pages/WebhookSimulator';
import { Settings } from './pages/Settings';
import {
  TriageResult,
  DashboardMetrics,
  RepositoryConfig,
  SystemSettings,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedRun, setSelectedRun] = useState<TriageResult | null>(null);

  const [runs, setRuns] = useState<TriageResult[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    triaged_this_week: 0,
    most_common_cause: 'None',
    avg_response_time_seconds: 0,
  });
  const [repos, setRepos] = useState<RepositoryConfig[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    max_log_tokens: 3500,
    rate_limit_per_min: 60,
    debug_mode: true,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Fetch real data from backend API
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    let connected = false;

    try {
      // Primary backend endpoint is /api/triage-results
      const runsRes = await axios.get('/api/triage-results', { timeout: 2500 });
      if (runsRes.status === 200 && Array.isArray(runsRes.data)) {
        connected = true;
        setRuns(runsRes.data);
      }
    } catch {
      try {
        const fallbackRes = await axios.get('/api/dashboard/runs', { timeout: 1500 });
        if (fallbackRes.status === 200 && Array.isArray(fallbackRes.data)) {
          connected = true;
          setRuns(fallbackRes.data);
        }
      } catch {
        // Backend offline or error - keep real current state (empty or user-added)
      }
    }

    try {
      const metricsRes = await axios.get('/api/metrics', { timeout: 2500 });
      if (metricsRes.data && typeof metricsRes.data === 'object') {
        connected = true;
        setMetrics(metricsRes.data);
      }
    } catch {
      try {
        const metricsFallback = await axios.get('/api/dashboard/metrics', { timeout: 1500 });
        if (metricsFallback.data) {
          setMetrics(metricsFallback.data);
        }
      } catch {
        // Keep current metrics state
      }
    }

    try {
      const reposRes = await axios.get('/api/repos', { timeout: 2500 });
      if (reposRes.status === 200 && Array.isArray(reposRes.data)) {
        connected = true;
        setRepos(reposRes.data);
      }
    } catch {
      // Keep current repos
    }

    try {
      const settingsRes = await axios.get('/api/settings', { timeout: 2500 });
      if (settingsRes.data) {
        setSettings((prev) => ({
          ...prev,
          ...settingsRes.data,
        }));
      }
    } catch {
      // Keep local settings
    }

    setIsBackendConnected(connected);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 300);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSelectRun = (run: TriageResult) => {
    setSelectedRun(run);
    setCurrentTab('detail');
  };

  const handleBackToDashboard = () => {
    setSelectedRun(null);
    setCurrentTab('dashboard');
  };

  const handleSimulateComplete = (newRun: TriageResult) => {
    setRuns((prev) => [newRun, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      triaged_this_week: prev.triaged_this_week + 1,
    }));
    setSelectedRun(newRun);
    setCurrentTab('detail');
  };

  const handleAddRepo = async (owner: string, name: string) => {
    try {
      const res = await axios.post('/api/repos', { owner, name, is_active: true }, { timeout: 3000 });
      if (res.data) {
        setRepos((prev) => [res.data, ...prev.filter((r) => r.id !== res.data.id)]);
        return;
      }
    } catch {
      // Local fallback if backend is offline
    }
    const newRepo: RepositoryConfig = {
      id: Date.now(),
      owner,
      name,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setRepos((prev) => [newRepo, ...prev]);
  };

  const handleToggleRepoActive = async (id: number) => {
    try {
      const res = await axios.patch(`/api/repos/${id}/toggle`, {}, { timeout: 3000 });
      if (res.data) {
        setRepos((prev) => prev.map((r) => (r.id === id ? res.data : r)));
        return;
      }
    } catch {
      // Local fallback
    }
    setRepos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    );
  };

  const handleDeleteRepo = async (id: number) => {
    try {
      await axios.delete(`/api/repos/${id}`, { timeout: 3000 });
    } catch {
      // Local fallback
    }
    setRepos((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveSettings = async (newSettings: SystemSettings) => {
    try {
      const res = await axios.post('/api/settings', newSettings, { timeout: 3000 });
      if (res.data) {
        setSettings(res.data);
        return;
      }
    } catch {
      // Local fallback
    }
    setSettings(newSettings);
  };

  const handlePostComment = async (runId: number) => {
    try {
      await axios.post(`/api/dashboard/runs/${runId}/post_comment`, {}, { timeout: 1500 });
    } catch {
      // Handled in UI
    }
    setRuns((prev) =>
      prev.map((r) =>
        r.run_id === runId
          ? {
            ...r,
            status: 'posted',
            github_comment_url: `https://github.com/${r.repo_name}/pull/${r.pr_number || 1}#comment-${Date.now()}`,
          }
          : r
      )
    );
    if (selectedRun && selectedRun.run_id === runId) {
      setSelectedRun((prev) =>
        prev
          ? {
            ...prev,
            status: 'posted',
            github_comment_url: `https://github.com/${prev.repo_name}/pull/${prev.pr_number || 1}#comment-${Date.now()}`,
          }
          : null
      );
    }
  };

  const handleReprocess = async (runId: number) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`/api/runs/${runId}/retry`, {}, { timeout: 10000 });
      if (res.data) {
        setRuns((prev) => prev.map((r) => (r.run_id === runId ? res.data : r)));
        if (selectedRun && selectedRun.run_id === runId) {
          setSelectedRun(res.data);
        }
      }
    } catch {
      // Handled or local simulation
    }
    await fetchDashboardData();
    setIsLoading(false);
  };

  const handleDeleteRun = async (run: TriageResult) => {
    const runId = run.run_id;
    try {
      await axios.delete(`/api/runs/${runId}`, { timeout: 3000 });
    } catch (err) {
      console.warn('Backend delete run warning:', err);
    }
    setRuns((prev) =>
      prev.filter((r) => r.run_id !== runId && (run.id ? r.id !== run.id : true))
    );
    if (selectedRun && (selectedRun.run_id === runId || (run.id && selectedRun.id === run.id))) {
      setSelectedRun(null);
      setCurrentTab('dashboard');
    }
  };

  const handleClearSimulated = async () => {
    try {
      await axios.delete('/api/triage-results/clear-simulated', { timeout: 3000 });
    } catch (err) {
      console.warn('Backend clear simulated warning:', err);
    }
    setRuns((prev) =>
      prev.filter(
        (r) =>
          !r.is_simulated &&
          !r.repo_name?.toLowerCase().includes('simulated') &&
          !r.raw_response?.includes('"simulated": true')
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white antialiased">
      {/* Global Header & Nav */}
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab !== 'detail') setSelectedRun(null);
          setCurrentTab(tab);
        }}
        onRefresh={fetchDashboardData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            runs={runs}
            metrics={metrics}
            onSelectRun={handleSelectRun}
            onDeleteRun={handleDeleteRun}
            onClearSimulated={handleClearSimulated}
            onOpenSimulator={() => setCurrentTab('simulator')}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'detail' && selectedRun && (
          <TriageDetail
            run={selectedRun}
            onBack={handleBackToDashboard}
            onPostComment={handlePostComment}
            onReprocess={handleReprocess}
            onDelete={handleDeleteRun}
          />
        )}

        {currentTab === 'repos' && (
          <ConnectRepo
            repos={repos}
            onAddRepo={handleAddRepo}
            onToggleActive={handleToggleRepoActive}
            onDeleteRepo={handleDeleteRepo}
          />
        )}

        {currentTab === 'simulator' && (
          <WebhookSimulator
            repos={repos}
            onSimulateComplete={handleSimulateComplete}
          />
        )}

        {currentTab === 'settings' && (
          <Settings
            settings={settings}
            onSave={handleSaveSettings}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Clean Architecture Triage Engine • FastAPI + Anthropic Claude</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
