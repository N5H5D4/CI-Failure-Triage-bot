// frontend/src/components/MetricsBar.jsx
import React from 'react';
import { BarChart3, AlertTriangle, Zap } from 'lucide-react';

export default function MetricsBar({ metrics, totalCount }) {
  const cards = [
    {
      title: 'Triaged This Week',
      value: metrics?.triaged_this_week ?? totalCount ?? 0,
      subtext: 'Auto-diagnosed failed CI runs',
      icon: BarChart3,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Most Common Cause',
      value: metrics?.most_common_cause || 'Dependency issue',
      subtext: 'Top recurring root failure',
      icon: AlertTriangle,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Avg Time to Comment',
      value: `${metrics?.avg_response_time_seconds || 18}s`,
      subtext: 'Webhook to GitHub PR delivery',
      icon: Zap,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm flex items-start justify-between transition hover:border-zinc-700"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{card.title}</p>
              <h3 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight">{card.value}</h3>
              <p className="text-xs text-zinc-500 mt-1">{card.subtext}</p>
            </div>
            <div className={`p-3 rounded-lg border ${card.bg} ${card.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
