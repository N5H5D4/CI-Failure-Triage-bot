export const theme = {
  // Color Palette
  colors: {
    background: 'bg-slate-50',
    surface: 'bg-white',
    surfaceSubtle: 'bg-slate-100/70',
    surfaceHover: 'hover:bg-slate-100/60',
    border: 'border-slate-200',
    borderSubtle: 'border-slate-200/80',
    borderHover: 'hover:border-slate-300',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-400',
    textAccent: 'text-emerald-600',
    accent: 'emerald',
    accentBg: 'bg-emerald-600',
    accentHover: 'hover:bg-emerald-500',
    accentSubtle: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    success: 'emerald',
    successBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'amber',
    warningBg: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'rose',
    errorBg: 'bg-rose-50 border-rose-200 text-rose-700',
  },

  // Card & Container Styles
  cards: {
    base: 'bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-all duration-200',
    interactive: 'bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm rounded-xl p-5 transition-all duration-200 shadow-xs',
    flat: 'bg-slate-50 border border-slate-200 rounded-lg p-3.5',
    terminal: 'bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-md',
    hero: 'bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white border border-emerald-100 rounded-2xl p-5 sm:p-6 shadow-xs',
  },

  // Button Styles
  buttons: {
    primary: 'inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 transition-all focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 cursor-pointer',
    secondary: 'inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400 transition-colors shadow-xs cursor-pointer',
    outline: 'inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 transition-colors shadow-xs cursor-pointer',
    ghost: 'inline-flex items-center justify-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer',
    danger: 'inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer',
    iconOnly: 'p-2 rounded-lg text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shadow-xs',
  },

  // Form Inputs
  inputs: {
    base: 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-sans shadow-xs',
    mono: 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-xs',
    textarea: 'w-full p-4 font-mono text-xs bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 leading-relaxed scrollbar-thin resize-y shadow-inner',
    select: 'bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer shadow-xs',
  },

  // Data Table Styles
  tables: {
    wrapper: 'bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs',
    headerRow: 'bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]',
    th: 'py-3 px-4',
    tr: 'hover:bg-slate-50/90 transition-colors cursor-pointer group border-b border-slate-100',
    td: 'py-3.5 px-4',
  },

  // Failure Category Badges
  categoryStyles: {
    syntax_error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      dot: 'bg-rose-500',
      label: 'Syntax Error',
    },
    test_failure: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      dot: 'bg-amber-500',
      label: 'Test Failure',
    },
    dependency_issue: {
      bg: 'bg-purple-50 border-purple-200 text-purple-700',
      dot: 'bg-purple-500',
      label: 'Dependency Issue',
    },
    flaky_test: {
      bg: 'bg-orange-50 border-orange-200 text-orange-800',
      dot: 'bg-orange-500',
      label: 'Flaky Test',
    },
    infrastructure_timeout: {
      bg: 'bg-blue-50 border-blue-200 text-blue-700',
      dot: 'bg-blue-500',
      label: 'Infra / Timeout',
    },
    configuration_error: {
      bg: 'bg-teal-50 border-teal-200 text-teal-800',
      dot: 'bg-teal-500',
      label: 'Config Error',
    },
    unknown: {
      bg: 'bg-slate-100 border-slate-200 text-slate-700',
      dot: 'bg-slate-400',
      label: 'Unknown',
    },
  },
};

export default theme;
