/**
 * Cron Webhook
 * GET /api/v1/webhooks/cron
 *
 * Endpoint for scheduled jobs (Vercel Cron, external scheduler, etc.)
 * Processes unprocessed leads on a schedule.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { processUnprocessedLeads } from '@/lib/application/workers';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for batch processing

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting intelligence processing job');

    const result = await processUnprocessedLeads({
      batchSize: 100,
      maxAgeHours: 1, // Only process leads created in the last hour
    });

    console.log('[Cron] Job completed:', {
      processed: result.processed,
      enriched: result.enriched,
      signalsTriggered: result.signalsTriggered,
      errors: result.errors.length,
      duration: result.duration,
    });

    return NextResponse.json({
      success: true,
      data: {
        processed: result.processed,
        enriched: result.enriched,
        signalsTriggered: result.signalsTriggered,
        errorCount: result.errors.length,
        durationMs: result.duration,
      },
    });
  } catch (error) {
    console.error('[Cron] Job failed:', error);
    return NextResponse.json(
      { success: false, error: 'Job failed' },
      { status: 500 }
    );
  }
}
