/**
 * Date Range Filter
 * Client component for selecting dashboard time range.
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Select } from '../ui/select';
import type { DateRange } from '@/lib/application/queries/dashboard.queries';

const DATE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

interface DateRangeFilterProps {
  value: DateRange;
}

export function DateRangeFilter({ value }: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (newValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', newValue);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <Select
      value={value}
      onChange={handleChange}
      options={DATE_OPTIONS}
      label="Period"
    />
  );
}
