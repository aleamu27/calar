/**
 * Card Component
 * Mithril-inspired card with subtle glow effects.
 */

import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div
      className={`
        relative rounded-xl border border-slate-800/50
        bg-gradient-to-b from-slate-900/90 to-slate-950/90
        backdrop-blur-sm
        ${glow ? 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`
        px-6 py-4 border-b border-slate-800/50
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3
      className={`
        text-sm font-medium uppercase tracking-wider text-slate-400
        ${className}
      `}
    >
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

interface CardValueProps {
  children: ReactNode;
  trend?: number;
  className?: string;
}

export function CardValue({ children, trend, className = '' }: CardValueProps) {
  return (
    <div className="flex items-end gap-3">
      <span
        className={`
          text-4xl font-light tracking-tight text-white
          ${className}
        `}
      >
        {children}
      </span>
      {trend !== undefined && (
        <span
          className={`
            text-sm font-medium mb-1
            ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          `}
        >
          {trend >= 0 ? '+' : ''}
          {trend}%
        </span>
      )}
    </div>
  );
}
