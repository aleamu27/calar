/**
 * Select Component
 * Styled dropdown with dark theme.
 */

'use client';

import { type ChangeEvent } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  label?: string;
}

export function Select({
  value,
  onChange,
  options,
  className = '',
  label,
}: SelectProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-400">{label}</label>
      )}
      <select
        value={value}
        onChange={handleChange}
        className="
          appearance-none rounded-lg border border-slate-700
          bg-slate-800/50 px-4 py-2 pr-10 text-sm text-slate-200
          outline-none transition-colors
          hover:border-slate-600 focus:border-indigo-500
          focus:ring-1 focus:ring-indigo-500/50
          cursor-pointer
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
          bg-[length:1.5rem_1.5rem]
          bg-[right_0.5rem_center]
          bg-no-repeat
        "
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
