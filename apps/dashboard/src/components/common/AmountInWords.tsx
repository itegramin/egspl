import React from 'react';
import { formatAmountInWords, AmountInWordsOptions } from '../../lib/indianCurrency';
import { IndianRupee } from 'lucide-react';

interface AmountInWordsProps extends AmountInWordsOptions {
  amount: number | string | null | undefined;
  className?: string;
  variant?: 'badge' | 'subtext' | 'inline';
  prefixLabel?: string;
  showIcon?: boolean;
}

export const AmountInWords: React.FC<AmountInWordsProps> = ({
  amount,
  currency = 'INR',
  includePrefix = true,
  includeSuffix = true,
  includePaise = true,
  className = '',
  variant = 'badge',
  prefixLabel = 'In Words:',
  showIcon = true,
}) => {
  const words = formatAmountInWords(amount, {
    currency,
    includePrefix,
    includeSuffix,
    includePaise,
  });

  if (!words) return null;

  if (variant === 'subtext') {
    return (
      <div
        className={`text-[11px] text-slate-500 dark:text-slate-400 font-medium italic flex items-start gap-1 ${className}`}
      >
        {showIcon && (
          <IndianRupee className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        )}
        <span>
          {prefixLabel && <span className="font-semibold not-italic mr-1 text-slate-600 dark:text-slate-300">{prefixLabel}</span>}
          {words}
        </span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium ${className}`}>
        {showIcon && <IndianRupee className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />}
        <span>{words}</span>
      </span>
    );
  }

  // Default: 'badge'
  return (
    <div
      className={`p-2 sm:p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2 shadow-xs ${className}`}
    >
      {showIcon && (
        <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
          <IndianRupee className="w-3.5 h-3.5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {prefixLabel && (
          <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
            {prefixLabel}
          </span>
        )}
        <p className="font-semibold text-xs sm:text-[13px] leading-snug break-words text-emerald-950 dark:text-emerald-100">
          {words}
        </p>
      </div>
    </div>
  );
};
