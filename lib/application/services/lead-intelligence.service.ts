/**
 * Lead Intelligence Service
 * Orchestrates the complete intelligence pipeline:
 * 1. Enrichment - Company data lookup
 * 2. Scoring - Calculate lead score
 * 3. Signals - Trigger notifications if thresholds exceeded
 *
 * This service is the main entry point for the Intelligence Layer.
 */

import { eq, sql, count, countDistinct } from 'drizzle-orm';
import { db } from '../../infrastructure/db/client';
import { leads, pageViews, visitors } from '../../infrastructure/db/schema';
import type { ScoreBreakdown } from '../../infrastructure/db/schema';
import { ScoreService } from './score.service';
import { EnrichmentService } from './enrichment.service';
import { SignalService } from './signal.service';
import type { ScoringInput, ScoringResult } from '../../core/interfaces/scoring';
import type { EnrichmentResult } from '../../core/interfaces/enrichment';

export interface IntelligenceResult {
  leadId: string;
  enrichment: EnrichmentResult | null;
  scoring: ScoringResult;
  signalTriggered: boolean;
  signalId: string | null;
  previousScore: number;
  newScore: number;
}

export interface ProcessLeadInput {
  leadId: string;
  ipAddress?: string;
  skipEnrichment?: boolean;
  skipSignals?: boolean;
}

export class LeadIntelligenceService {
  constructor(
    private readonly scoreService: ScoreService = new ScoreService(),
    private readonly enrichmentService: EnrichmentService = new EnrichmentService(),
    private readonly signalService: SignalService = new SignalService()
  ) {}

  /**
   * Processes a lead through the complete intelligence pipeline.
   * This is the main entry point for lead intelligence processing.
   */
  async processLead(input: ProcessLeadInput): Promise<IntelligenceResult> {
    const { leadId, ipAddress, skipEnrichment = false, skipSignals = false } = input;

    // Fetch lead data
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const previousScore = lead.score;
    let enrichmentResult: EnrichmentResult | null = null;

    // Step 1: Enrichment (if not already enriched and not skipped)
    if (!skipEnrichment && !lead.enrichedCompany) {
      enrichmentResult = await this.enrichLead(leadId, lead.email, ipAddress);
    }

    // Step 2: Gather scoring inputs
    const scoringInput = await this.gatherScoringInput(
      lead.visitorId,
      lead.email,
      enrichmentResult?.success ?? Boolean(lead.enrichedCompany)
    );

    // Step 3: Calculate score
    const scoringResult = this.scoreService.calculate(scoringInput);

    // Step 4: Update lead with new score
    await this.updateLeadScore(leadId, scoringResult);

    // Step 5: Check for signal triggers (if not skipped)
    let signalTriggered = false;
    let signalId: string | null = null;

    if (!skipSignals) {
      const shouldTrigger = this.signalService.shouldTriggerScoreThreshold(
        scoringResult.totalScore
      );

      // Only trigger if score newly exceeds threshold (wasn't already above)
      const wasAboveThreshold = this.signalService.shouldTriggerScoreThreshold(previousScore);

      if (shouldTrigger && !wasAboveThreshold) {
        const signalResult = await this.signalService.triggerScoreThreshold(
          leadId,
          scoringResult.totalScore
        );
        signalTriggered = true;
        signalId = signalResult.signalId;
      }
    }

    return {
      leadId,
      enrichment: enrichmentResult,
      scoring: scoringResult,
      signalTriggered,
      signalId,
      previousScore,
      newScore: scoringResult.totalScore,
    };
  }

  /**
   * Enriches a lead with company data.
   */
  private async enrichLead(
    leadId: string,
    email: string,
    ipAddress?: string
  ): Promise<EnrichmentResult> {
    const enrichmentInput = EnrichmentService.createInput({
      email,
      ipAddress,
    });

    const result = await this.enrichmentService.enrich(enrichmentInput);

    if (result.success && result.companyName) {
      await db
        .update(leads)
        .set({
          enrichedCompany: result.companyName,
          enrichedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
    }

    return result;
  }

  /**
   * Gathers all data needed for scoring calculation.
   */
  private async gatherScoringInput(
    visitorId: string,
    email: string,
    hasEnrichedCompany: boolean
  ): Promise<ScoringInput> {
    // Get page view stats
    const [pageViewStats] = await db
      .select({
        totalViews: count(),
        highValueViews: sql<number>`COUNT(*) FILTER (WHERE ${pageViews.isHighValue} = true)`,
      })
      .from(pageViews)
      .where(eq(pageViews.visitorId, visitorId));

    // Get unique visit days
    const [visitStats] = await db
      .select({
        uniqueDays: countDistinct(sql`DATE(${visitors.lastSeenAt})`),
      })
      .from(visitors)
      .where(eq(visitors.id, visitorId));

    return {
      email,
      pageViewCount: pageViewStats?.totalViews ?? 0,
      highValuePageCount: Number(pageViewStats?.highValueViews ?? 0),
      uniqueVisitDays: Number(visitStats?.uniqueDays ?? 1),
      hasEnrichedCompany,
    };
  }

  /**
   * Updates lead with calculated score.
   */
  private async updateLeadScore(
    leadId: string,
    scoringResult: ScoringResult
  ): Promise<void> {
    const scoreBreakdown: ScoreBreakdown = {
      ...scoringResult.breakdown,
      total: scoringResult.totalScore,
      calculatedAt: scoringResult.calculatedAt.toISOString(),
    };

    await db
      .update(leads)
      .set({
        score: scoringResult.totalScore,
        scoreBreakdown,
      })
      .where(eq(leads.id, leadId));
  }

  /**
   * Recalculates scores for all leads.
   * Useful for batch processing or when scoring weights change.
   */
  async recalculateAllScores(): Promise<{ processed: number; errors: number }> {
    const allLeads = await db.select({ id: leads.id }).from(leads);

    let processed = 0;
    let errors = 0;

    for (const lead of allLeads) {
      try {
        await this.processLead({
          leadId: lead.id,
          skipEnrichment: true, // Don't re-enrich, just recalculate
          skipSignals: true, // Don't trigger signals on recalculation
        });
        processed++;
      } catch (error) {
        console.error(`Error processing lead ${lead.id}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  }
}

/**
 * Default service instance.
 */
export const leadIntelligenceService = new LeadIntelligenceService();
