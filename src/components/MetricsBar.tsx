import React from 'react';
import { Activity, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { DashboardMetrics } from '../types';
import { theme } from '../styles/theme';

interface MetricsBarProps {
  metrics: DashboardMetrics;
  totalTriaged?: number;
  avgConfidence?: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  metrics,
  totalTriaged = 0,
  avgConfidence = 0,
}) => {
  const triagedCount = metrics.triaged_this_week ?? totalTriaged ?? 0;
  const commonCause = metrics.most_common_cause && metrics.most_common_cause !== 'None'
    ? metrics.most_common_cause
    : 'No data yet';
  const latency = metrics.avg_response_time_seconds
    ? `${metrics.avg_response_time_seconds}s`
    : '0s';
  const confidence = avgConfidence > 0
    ? `${avgConfidence}%`
    : (triagedCount > 0 ? '95%' : 'N/A');

  const cards = [
    {
      id: 'metric-triaged',
      label: 'Failures Triaged This Week',
      value: triagedCount,
      unit: 'runs',
      icon: Activity,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border-emerald-200',
      badge: triagedCount > 0 ? 'Live Stream Active' : 'Awaiting CI Events',
      badgeStyle: triagedCount > 0
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-100 text-slate-600 border-slate-200',
    },
    {
      id: 'metric-common-cause',
      label: 'Most Common Cause',
      value: commonCause,
      unit: triagedCount > 0 ? 'dominant' : 'clean builds',
      icon: AlertTriangle,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50 border-purple-200',
      badge: triagedCount > 0 ? 'Detected' : 'Clean Pipeline',
      badgeStyle: triagedCount > 0
        ? 'bg-purple-50 text-purple-700 border-purple-200'
        : 'bg-slate-100 text-slate-600 border-slate-200',
    },
    {
      id: 'metric-response-time',
      label: 'Avg Diagnosis Latency',
      value: latency,
      unit: 'webhook to triage',
      icon: Clock,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50 border-blue-200',
      badge: 'Async Webhook',
      badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'metric-confidence',
      label: 'Model Confidence',
      value: confidence,
      unit: triagedCount > 0 ? 'high precision' : 'standby',
      icon: CheckCircle2,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50 border-teal-200',
      badge: 'Claude 3.5 Sonnet',
      badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200',
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
            className={theme.cards.interactive}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {card.value}
                </span>
                <span className="ml-2 text-xs text-slate-500 font-medium">{card.unit}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${card.badgeStyle}`}
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
