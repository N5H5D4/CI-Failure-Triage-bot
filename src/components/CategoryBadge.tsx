import React from 'react';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
  showDot = true,
}) => {
  const normalized = (category || '').toLowerCase().trim();

  const getStyle = () => {
    switch (normalized) {
      case 'syntax_error':
      case 'syntax error':
      case 'build_failure':
        return {
          bg: 'bg-red-500/10 border-red-500/20 text-red-400',
          dot: 'bg-red-400',
          label: 'Syntax Error',
        };
      case 'test_failure':
      case 'test failure':
      case 'unit_test_failed':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          dot: 'bg-amber-400',
          label: 'Test Failure',
        };
      case 'dependency_issue':
      case 'dependency issue':
      case 'missing_package':
        return {
          bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
          dot: 'bg-purple-400',
          label: 'Dependency Issue',
        };
      case 'flaky_test':
      case 'flaky test':
        return {
          bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
          dot: 'bg-orange-400',
          label: 'Flaky Test',
        };
      case 'infrastructure_timeout':
      case 'infrastructure timeout':
      case 'timeout':
        return {
          bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          dot: 'bg-blue-400',
          label: 'Infra / Timeout',
        };
      default:
        return {
          bg: 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300',
          dot: 'bg-zinc-400',
          label: category.replace(/_/g, ' '),
        };
    }
  };

  const style = getStyle();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 space-x-1.5',
    md: 'text-xs px-2.5 py-1 space-x-1.5',
    lg: 'text-sm px-3 py-1.5 space-x-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium tracking-wide uppercase whitespace-nowrap transition-colors ${style.bg} ${sizeClasses}`}
      title={category}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0 animate-pulse`}
        />
      )}
      <span>{style.label}</span>
    </span>
  );
};

export default CategoryBadge;
