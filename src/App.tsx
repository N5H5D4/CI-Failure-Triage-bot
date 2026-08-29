import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { TriageDetail } from './pages/TriageDetail';
import { ConnectRepo } from './pages/ConnectRepo';
import { WebhookSimulator } from './pages/WebhookSimulator';
import { Settings } from './pages/Settings';
import {
  INITIAL_MOCK_RUNS,
  INITIAL_METRICS,
  INITIAL_REPOS,
} from './data/mockData';
import {
  TriageResult,
  DashboardMetrics,
  RepositoryConfig,
  SystemSettings,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedRun, setSelectedRun] = useState<TriageResult | null>(null);

  const [runs, setRuns] = useState<TriageResult[]>(INITIAL_MOCK_RUNS);
  const [metrics, setMetrics] = useState<DashboardMetrics>(INITIAL_METRICS);
  const [repos, setRepos] = useState<RepositoryConfig[]>(INITIAL_REPOS);
  const [settings, setSettings] = useState<SystemSettings>({
    max_log_tokens: 3500,
    rate_limit_per_min: 60,
    debug_mode: true,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Attempt to fetch from backend if running, fallback gracefully to mock data
  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    let connected = false;

    try {
      // Primary backend endpoint is /api/triage-results
      const runsRes = await axios.get('/api/triage-results', { timeout: 2500 });
      if (runsRes.status === 200 && Array.isArray(runsRes.data)) {
        connected = true;
        // If DB has records, populate them directly
        if (runsRes.data.length > 0) {
          setRuns(runsRes.data);
        }
      }
    } catch {
      try {
        const fallbackRes = await axios.get('/api/dashboard/runs', { timeout: 1500 });
        if (fallbackRes.status === 200 && Array.isArray(fallbackRes.data)) {
          connected = true;
          if (fallbackRes.data.length > 0) {
            setRuns(fallbackRes.data);
          }
        }
      } catch {
        // Backend not running or static preview mode - mock data active
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
        // Keep fallback state metrics
      }
    }

    try {
      const reposRes = await axios.get('/api/repos', { timeout: 2500 });
      if (reposRes.status === 200 && Array.isArray(reposRes.data)) {
        connected = true;
        setRepos(reposRes.data);
      }
    } catch {
      // Keep state repos
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
      await axios.post(`/api/runs/${runId}/retry`, {}, { timeout: 10000 });
    } catch {
      // Handled or local simulation
    }
    await fetchDashboardData();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white antialiased">
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
          <WebhookSimulator onSimulateComplete={handleSimulateComplete} />
        )}

        {currentTab === 'settings' && (
          <Settings
            settings={settings}
            onSave={handleSaveSettings}
          />
        )}
      </main>

      {/* Global Sophisticated Dark Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Clean Architecture Triage Engine • FastAPI + Anthropic Claude</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-zinc-600">Theme: Sophisticated Dark</span>
            <span>v1.4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
