/**
 * Intelligence Processing API
 * POST /api/v1/intelligence/process
 *
 * Triggers intelligence processing for a single lead or batch.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  processSingleLead,
  processUnprocessedLeads,
} from '@/lib/application/workers';

interface ProcessRequestBody {
  mode: 'single' | 'batch';
  leadId?: string;
  ipAddress?: string;
  batchSize?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify API key for batch operations
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.INTELLIGENCE_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await parseRequestBody(request);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (body.mode === 'single') {
      if (!body.leadId) {
        return NextResponse.json(
          { success: false, error: 'leadId required for single mode' },
          { status: 400 }
        );
      }

      const result = await processSingleLead(body.leadId, body.ipAddress);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          leadId: body.leadId,
          newScore: result.result?.newScore,
          previousScore: result.result?.previousScore,
          enriched: result.result?.enrichment?.success ?? false,
          signalTriggered: result.result?.signalTriggered ?? false,
        },
      });
    }

    if (body.mode === 'batch') {
      const result = await processUnprocessedLeads({
        batchSize: body.batchSize ?? 50,
      });

      return NextResponse.json({
        success: true,
        data: {
          processed: result.processed,
          enriched: result.enriched,
          signalsTriggered: result.signalsTriggered,
          errors: result.errors,
          durationMs: result.duration,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid mode. Use "single" or "batch".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Intelligence processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function parseRequestBody(
  request: NextRequest
): Promise<ProcessRequestBody | null> {
  try {
    const body = await request.json();

    if (typeof body !== 'object' || body === null) {
      return null;
    }

    if (!['single', 'batch'].includes(body.mode)) {
      return null;
    }

    return body as ProcessRequestBody;
  } catch {
    return null;
  }
}
