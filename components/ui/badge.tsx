/**
 * Badge Component
 * Channel/source indicator with color coding.
 */

import { type ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'muted';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  info: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  muted: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-md border px-2 py-0.5
        text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

/**
 * Maps UTM sources to badge variants for consistent styling.
 */
export function getSourceVariant(source: string | null): BadgeVariant {
  if (!source) return 'muted';

  const normalized = source.toLowerCase();

  if (['google', 'bing', 'yahoo'].some((s) => normalized.includes(s))) {
    return 'info';
  }
  if (['linkedin', 'facebook', 'twitter', 'instagram'].some((s) => normalized.includes(s))) {
    return 'default';
  }
  if (['email', 'newsletter'].some((s) => normalized.includes(s))) {
    return 'success';
  }
  if (['partner', 'referral'].some((s) => normalized.includes(s))) {
    return 'warning';
  }

  return 'default';
}
