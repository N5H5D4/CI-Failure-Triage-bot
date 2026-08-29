// frontend/src/components/CategoryBadge.jsx
import React from 'react';

const CATEGORY_MAP = {
  dependency_issue: {
    label: 'Dependency Issue',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    dot: 'bg-purple-400'
  },
  syntax_error: {
    label: 'Syntax Error',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-400'
  },
  test_failure: {
    label: 'Test Failure',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400'
  },
  flaky_test: {
    label: 'Flaky Test',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    dot: 'bg-orange-400'
  },
  configuration_error: {
    label: 'Config Error',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400'
  },
  infrastructure_timeout: {
    label: 'Timeout',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400'
  },
  unknown: {
    label: 'Unknown',
    className: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    dot: 'bg-zinc-400'
  }
};

export default function CategoryBadge({ category }) {
  const config = CATEGORY_MAP[category] || {
    label: category ? category.replace('_', ' ') : 'Unknown',
    className: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    dot: 'bg-zinc-400'
  };

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border whitespace-nowrap ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0 animate-pulse`} />
      <span>{config.label}</span>
    </span>
  );
}
