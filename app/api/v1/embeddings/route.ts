/**
 * Embeddings API
 * POST /api/v1/embeddings - Generate embedding for a lead
 * GET /api/v1/embeddings/search - Semantic search
 */

import { NextResponse, type NextRequest } from 'next/server';
import { embeddingService } from '@/lib/application/services';
import { withApiKeyAuth, withScope } from '@/lib/application/middleware';

/**
 * Generates embedding for a lead's behavioral summary.
 */
export const POST = withScope('embeddings:write', async (
  request: NextRequest,
  tenantId: string
) => {
  try {
    const body = await request.json();

    if (!body.leadId) {
      return NextResponse.json(
        { success: false, error: 'leadId is required' },
        { status: 400 }
      );
    }

    const embeddingId = await embeddingService.embedLeadBehavior(
      tenantId,
      body.leadId
    );

    return NextResponse.json({
      success: true,
      data: {
        embeddingId,
        leadId: body.leadId,
        provider: embeddingService.getProviderInfo(),
      },
    });
  } catch (error) {
    console.error('Embedding generation error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
