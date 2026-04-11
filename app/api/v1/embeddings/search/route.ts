/**
 * Semantic Search API
 * GET /api/v1/embeddings/search - Search leads by semantic similarity
 */

import { NextResponse, type NextRequest } from 'next/server';
import { embeddingService } from '@/lib/application/services';
import { withScope } from '@/lib/application/middleware';

/**
 * Semantic search across leads.
 */
export const GET = withScope('embeddings:read', async (
  request: NextRequest,
  tenantId: string
) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const results = await embeddingService.searchLeads(
      tenantId,
      query,
      Math.min(limit, 50) // Cap at 50
    );

    return NextResponse.json({
      success: true,
      data: {
        query,
        results,
        count: results.length,
      },
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
