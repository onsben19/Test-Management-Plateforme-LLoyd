type TableRowTdOptions = {
  padding?: 'sm' | 'md' | 'lg';
  selected?: boolean;
};

const PADDING_CLASS: Record<NonNullable<TableRowTdOptions['padding']>, string> = {
  sm: 'px-6 py-5',
  md: 'px-8 py-5',
  lg: 'p-4',
};

/** Classes TD pour lignes de tableau — compatibles light & dark. */
export const buildTableRowTdClass = ({
  padding = 'md',
  selected = false,
}: TableRowTdOptions = {}) => {
  const bg = selected
    ? 'bg-blue-50 dark:bg-blue-500/10'
    : 'bg-slate-50 dark:bg-[#0b0e14]/60';

  const hover = selected
    ? 'group-hover:bg-blue-100 dark:group-hover:bg-blue-500/15'
    : 'group-hover:bg-slate-100 dark:group-hover:bg-white/[0.07]';

  return [
    PADDING_CLASS[padding],
    'text-sm text-slate-700 dark:text-slate-300',
    bg,
    hover,
    'transition-colors',
    'first:rounded-l-2xl last:rounded-r-2xl',
    'border-t border-b first:border-l last:border-r',
    'border-slate-200 dark:border-white/[0.03]',
    'group-hover:border-slate-300 dark:group-hover:border-white/12',
  ].join(' ');
};
