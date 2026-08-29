import React from 'react';
import {
  Bot,
  Activity,
  GitBranch,
  PlayCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onRefresh,
  isRefreshing = false,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Triage Dashboard', icon: Activity },
    { id: 'repos', label: 'Connected Repos', icon: GitBranch },
    { id: 'simulator', label: 'Webhook Simulator', icon: PlayCircle },
    { id: 'settings', label: 'Bot Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-0.5 shadow-lg shadow-indigo-950/40 flex items-center justify-center border border-indigo-400/20">
              <Bot className="w-5 h-5 text-zinc-100" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-zinc-100 tracking-tight text-base font-sans">
                  CI Triage Bot
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Automated CI/CD failure root-cause analysis
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-zinc-900 text-zinc-100 border border-zinc-700/80 shadow-sm shadow-black/40'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-400' : 'text-zinc-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right utility buttons */}
          <div className="flex items-center space-x-2.5">
            {onRefresh && (
              <button
                id="header-refresh-btn"
                onClick={onRefresh}
                title="Refresh Triage Stream"
                className={`p-2 rounded-lg text-zinc-400 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors ${
                  isRefreshing ? 'animate-spin text-indigo-400' : ''
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              id="header-quick-simulate-btn"
              onClick={() => setCurrentTab('simulator')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-900/40 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simulate Run</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden border-t border-zinc-800/80 py-2 space-x-1 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
