/**
 * Intelligence Worker
 * Background job processor for lead intelligence operations.
 * Can be triggered via API endpoint or scheduled job.
 */

import { eq, isNull, and, lt } from 'drizzle-orm';
import { db } from '../../infrastructure/db/client';
import { leads } from '../../infrastructure/db/schema';
import { leadIntelligenceService } from '../services/lead-intelligence.service';

export interface WorkerResult {
  processed: number;
  enriched: number;
  signalsTriggered: number;
  errors: string[];
  duration: number;
}

export interface WorkerOptions {
  batchSize?: number;
  skipEnrichment?: boolean;
  skipSignals?: boolean;
  maxAgeHours?: number;
}

const DEFAULT_OPTIONS: Required<WorkerOptions> = {
  batchSize: 50,
  skipEnrichment: false,
  skipSignals: false,
  maxAgeHours: 24,
};

/**
 * Processes unprocessed leads through the intelligence pipeline.
 * This function is idempotent and safe to run multiple times.
 */
export async function processUnprocessedLeads(
  options: WorkerOptions = {}
): Promise<WorkerResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const result: WorkerResult = {
    processed: 0,
    enriched: 0,
    signalsTriggered: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Find leads that haven't been scored yet (score = 0 and no enrichment)
    const cutoffTime = new Date(Date.now() - opts.maxAgeHours * 60 * 60 * 1000);

    const unprocessedLeads = await db
      .select({
        id: leads.id,
        ipAddress: leads.ipAddress,
      })
      .from(leads)
      .where(
        and(
          eq(leads.score, 0),
          isNull(leads.enrichedAt),
          lt(leads.createdAt, cutoffTime)
        )
      )
      .limit(opts.batchSize);

    for (const lead of unprocessedLeads) {
      try {
        const intelligenceResult = await leadIntelligenceService.processLead({
          leadId: lead.id,
          ipAddress: lead.ipAddress ?? undefined,
          skipEnrichment: opts.skipEnrichment,
          skipSignals: opts.skipSignals,
        });

        result.processed++;

        if (intelligenceResult.enrichment?.success) {
          result.enriched++;
        }

        if (intelligenceResult.signalTriggered) {
          result.signalsTriggered++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Lead ${lead.id}: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Worker error: ${message}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Processes a single lead by ID.
 * Useful for immediate processing after lead capture.
 */
export async function processSingleLead(
  leadId: string,
  ipAddress?: string
): Promise<{ success: boolean; result?: Awaited<ReturnType<typeof leadIntelligenceService.processLead>>; error?: string }> {
  try {
    const result = await leadIntelligenceService.processLead({
      leadId,
      ipAddress,
    });

    return { success: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Recalculates scores for all leads.
 * Useful when scoring weights are updated.
 */
export async function recalculateAllScores(): Promise<WorkerResult> {
  const startTime = Date.now();

  const result: WorkerResult = {
    processed: 0,
    enriched: 0,
    signalsTriggered: 0,
    errors: [],
    duration: 0,
  };

  try {
    const stats = await leadIntelligenceService.recalculateAllScores();
    result.processed = stats.processed;
    result.errors = stats.errors > 0
      ? [`${stats.errors} leads failed to process`]
      : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Recalculation error: ${message}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}
