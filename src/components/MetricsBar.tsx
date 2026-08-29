import React from 'react';
import { Activity, AlertTriangle, Clock, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import { DashboardMetrics } from '../types';

interface MetricsBarProps {
  metrics: DashboardMetrics;
  totalTriaged?: number;
  avgConfidence?: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  metrics,
  totalTriaged = 142,
  avgConfidence = 94.6,
}) => {
  const cards = [
    {
      id: 'metric-triaged',
      label: 'Triaged This Week',
      value: metrics.triaged_this_week || totalTriaged,
      unit: 'failures',
      icon: Activity,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      badge: '+18.4% vs last week',
      badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      id: 'metric-common-cause',
      label: 'Most Common Cause',
      value: metrics.most_common_cause || 'Dependency issue',
      unit: '38% of total',
      icon: AlertTriangle,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
      badge: 'Package Conflicts',
      badgeStyle: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    {
      id: 'metric-response-time',
      label: 'Avg Triage Latency',
      value: `${metrics.avg_response_time_seconds || 18}s`,
      unit: 'from webhook to comment',
      icon: Clock,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      badge: 'Real-time Async',
      badgeStyle: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      id: 'metric-confidence',
      label: 'Model Confidence',
      value: `${avgConfidence}%`,
      unit: 'high diagnostic fidelity',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      badge: 'Claude 3.5 Sonnet',
      badgeStyle: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 sm:p-5 transition-all duration-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={`p-2 rounded-lg border ${card.iconBg} ${card.iconColor}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold tracking-tight text-zinc-100">
                  {card.value}
                </span>
                <span className="ml-2 text-xs text-zinc-500">{card.unit}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${card.badgeStyle}`}
              >
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricsBar;
