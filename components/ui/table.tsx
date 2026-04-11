/**
 * Table Components
 * Clean, sortable data table with dark theme styling.
 */

import { type ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`
          w-full border-collapse text-sm
          ${className}
        `}
      >
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
}

export function TableHeader({ children }: TableHeaderProps) {
  return (
    <thead className="border-b border-slate-800/70">
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: ReactNode;
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody className="divide-y divide-slate-800/50">{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
}

export function TableRow({ children, className = '' }: TableRowProps) {
  return (
    <tr
      className={`
        transition-colors hover:bg-slate-800/30
        ${className}
      `}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onClick?: () => void;
}

export function TableHead({
  children,
  className = '',
  sortable = false,
  sorted = null,
  onClick,
}: TableHeadProps) {
  return (
    <th
      className={`
        px-4 py-3 text-left font-medium uppercase tracking-wider text-slate-500
        text-xs
        ${sortable ? 'cursor-pointer select-none hover:text-slate-300' : ''}
        ${className}
      `}
      onClick={sortable ? onClick : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-slate-600">
            {sorted === 'asc' && '↑'}
            {sorted === 'desc' && '↓'}
            {!sorted && '↕'}
          </span>
        )}
      </div>
    </th>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}

export function TableCell({
  children,
  className = '',
  muted = false,
}: TableCellProps) {
  return (
    <td
      className={`
        px-4 py-4
        ${muted ? 'text-slate-500' : 'text-slate-300'}
        ${className}
      `}
    >
      {children}
    </td>
  );
}
