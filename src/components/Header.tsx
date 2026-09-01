import React from 'react';
import {
  Bot,
  Activity,
  GitBranch,
  PlayCircle,
  Settings as SettingsIcon,
  RefreshCw,
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
    { id: 'repos', label: 'Connected Repositories', icon: GitBranch },
    { id: 'simulator', label: 'Webhook Simulator', icon: PlayCircle },
    { id: 'settings', label: 'System Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-green-800 text-white shadow-md border-b border-emerald-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-800 p-0.5 shadow-sm flex items-center justify-center border border-emerald-600/30">
              <Bot className="w-6 h-6 text-emerald-800" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white tracking-tight text-base font-sans">
                  CI Triage Bot
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-900/80 text-emerald-200 border border-emerald-600/50 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                  Active
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Automated CI/CD Failure Root-Cause Analysis
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
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${isActive
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-emerald-100 hover:text-white hover:bg-emerald-700/60'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-emerald-200'
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
                className={`p-2 rounded-lg text-emerald-100 hover:text-white bg-emerald-700/70 hover:bg-emerald-700 border border-emerald-600/60 transition-colors cursor-pointer shadow-xs ${isRefreshing ? 'animate-spin text-white' : ''
                  }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden border-t border-emerald-700/80 py-2 space-x-1 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${isActive
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-emerald-100 hover:text-white hover:bg-emerald-700/60'
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-emerald-200'}`} />
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
