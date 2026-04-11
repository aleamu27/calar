/**
 * Similar Leads API
 * GET /api/v1/embeddings/similar - Find similar leads
 */

import { NextResponse, type NextRequest } from 'next/server';
import { embeddingService } from '@/lib/application/services';
import { withScope } from '@/lib/application/middleware';

/**
 * Find leads similar to a given lead.
 */
export const GET = withScope('embeddings:read', async (
  request: NextRequest,
  tenantId: string
) => {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "leadId" is required' },
        { status: 400 }
      );
    }

    const results = await embeddingService.findSimilarLeads(
      tenantId,
      leadId,
      Math.min(limit, 50)
    );

    return NextResponse.json({
      success: true,
      data: {
        sourceLead: leadId,
        similarLeads: results,
        count: results.length,
      },
    });
  } catch (error) {
    console.error('Similar leads error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
