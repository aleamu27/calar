/**
 * Input Component
 * Styled input field with dark theme.
 */

'use client';

import { type ChangeEvent, type InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  label?: string;
  prefix?: string;
  suffix?: string;
}

export function Input({
  value,
  onChange,
  label,
  prefix,
  suffix,
  className = '',
  ...props
}: InputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-400">{label}</label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-4 text-sm text-slate-500">
            {prefix}
          </span>
        )}
        <input
          value={value}
          onChange={handleChange}
          className={`
            w-full rounded-lg border border-slate-700
            bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200
            outline-none transition-colors
            placeholder:text-slate-600
            hover:border-slate-600
            focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50
            ${prefix ? 'pl-12' : ''}
            ${suffix ? 'pr-16' : ''}
          `}
          {...props}
        />
        {suffix && (
          <span className="absolute right-4 text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
