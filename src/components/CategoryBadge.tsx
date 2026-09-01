import React from 'react';
import { theme } from '../styles/theme';

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
        return theme.categoryStyles.syntax_error;
      case 'test_failure':
      case 'test failure':
      case 'unit_test_failed':
        return theme.categoryStyles.test_failure;
      case 'dependency_issue':
      case 'dependency issue':
      case 'missing_package':
        return theme.categoryStyles.dependency_issue;
      case 'flaky_test':
      case 'flaky test':
        return theme.categoryStyles.flaky_test;
      case 'infrastructure_timeout':
      case 'infrastructure timeout':
      case 'timeout':
        return theme.categoryStyles.infrastructure_timeout;
      case 'configuration_error':
      case 'config_error':
        return theme.categoryStyles.configuration_error;
      default:
        return {
          ...theme.categoryStyles.unknown,
          label: category ? category.replace(/_/g, ' ') : 'Unknown',
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
      className={`inline-flex items-center rounded-full border font-medium tracking-wide whitespace-nowrap transition-colors ${style.bg} ${sizeClasses}`}
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

