/**
 * UTM Builder Page
 * Tool for creating UTM-tagged campaign URLs.
 */

import { UTMBuilder } from '@/components/dashboard';

export default function UTMBuilderPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          UTM Builder
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Lag sporbare lenker for markedsføringskampanjene dine.
        </p>
      </div>

      <UTMBuilder />
    </div>
  );
}
