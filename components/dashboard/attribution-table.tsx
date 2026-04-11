/**
 * Attribution Table
 * Displays leads with their attribution data in a sortable table.
 */

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table';
import { Badge, getSourceVariant } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import type { DashboardLead } from '@/lib/application/queries/dashboard.queries';

interface AttributionTableProps {
  leads: DashboardLead[];
  total: number;
}

export function AttributionTable({ leads, total }: AttributionTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lead Attribution</CardTitle>
          <span className="text-sm text-slate-500">
            {total.toLocaleString()} total leads
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Landing Page</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell className="py-12 text-center text-slate-500" colSpan={5}>
                  No leads captured yet
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200">
                        {lead.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-slate-500">{lead.email}</span>
                      {lead.company && (
                        <span className="text-xs text-slate-600">
                          {lead.company}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getSourceVariant(lead.utmSource)}>
                        {lead.utmSource || 'Direct'}
                      </Badge>
                      {lead.utmMedium && (
                        <span className="text-xs text-slate-500">
                          {lead.utmMedium}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.utmCampaign ? (
                      <span className="text-slate-300">{lead.utmCampaign}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.landingPage ? (
                      <span
                        className="max-w-[200px] truncate text-slate-400"
                        title={lead.landingPage}
                      >
                        {formatPath(lead.landingPage)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell muted>
                    {formatDate(lead.convertedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatPath(path: string): string {
  try {
    const url = new URL(path, 'https://example.com');
    return url.pathname + url.search;
  } catch {
    return path;
  }
}
