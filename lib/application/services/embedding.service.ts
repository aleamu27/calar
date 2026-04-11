/**
 * Embedding Service
 * Manages vector embedding generation and similarity search.
 */

import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../infrastructure/db/client';
import { embeddings, leads, pageViews, attributions } from '../../infrastructure/db/schema';
import type { EmbeddingType, LeadRecord } from '../../infrastructure/db/schema';
import type {
  IEmbeddingProvider,
  EmbeddingInput,
  SimilarityResult,
} from '../../core/interfaces/embedding';
import { MockEmbeddingProvider, OpenAIEmbeddingProvider } from '../../infrastructure/embeddings';

export class EmbeddingService {
  private readonly provider: IEmbeddingProvider;

  constructor(provider?: IEmbeddingProvider) {
    // Use OpenAI if configured, otherwise mock
    if (provider) {
      this.provider = provider;
    } else if (process.env.OPENAI_API_KEY) {
      this.provider = new OpenAIEmbeddingProvider();
    } else {
      this.provider = new MockEmbeddingProvider();
    }
  }

  /**
   * Generates and stores embedding for a lead's behavioral summary.
   */
  async embedLeadBehavior(tenantId: string, leadId: string): Promise<string> {
    // Fetch lead with related data
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .limit(1);

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    // Build behavioral summary
    const summary = await this.buildBehavioralSummary(tenantId, lead);

    // Generate embedding
    const result = await this.provider.embed({ text: summary });

    // Store embedding
    const [embedding] = await db
      .insert(embeddings)
      .values({
        tenantId,
        type: 'lead_behavior',
        sourceId: leadId,
        sourceText: summary,
        embedding: result.embedding,
        model: result.model,
        metadata: {
          leadEmail: lead.email,
          leadScore: lead.score,
          dimensions: result.dimensions,
        },
      })
      .onConflictDoUpdate({
        target: [embeddings.tenantId, embeddings.sourceId],
        set: {
          sourceText: summary,
          embedding: result.embedding,
          model: result.model,
          updatedAt: new Date(),
        },
      })
      .returning({ id: embeddings.id });

    return embedding.id;
  }

  /**
   * Finds similar leads based on behavioral embedding.
   */
  async findSimilarLeads(
    tenantId: string,
    leadId: string,
    limit = 10
  ): Promise<SimilarityResult[]> {
    // Get the lead's embedding
    const [sourceEmbedding] = await db
      .select()
      .from(embeddings)
      .where(
        and(
          eq(embeddings.tenantId, tenantId),
          eq(embeddings.sourceId, leadId),
          eq(embeddings.type, 'lead_behavior')
        )
      )
      .limit(1);

    if (!sourceEmbedding?.embedding) {
      // Generate embedding if doesn't exist
      await this.embedLeadBehavior(tenantId, leadId);
      return this.findSimilarLeads(tenantId, leadId, limit);
    }

    // Find similar embeddings using cosine similarity
    // Note: This requires pgvector extension
    const similar = await db
      .select({
        id: embeddings.id,
        sourceId: embeddings.sourceId,
        sourceText: embeddings.sourceText,
        similarity: sql<number>`1 - (${embeddings.embedding} <=> ${sourceEmbedding.embedding}::vector)`,
        metadata: embeddings.metadata,
      })
      .from(embeddings)
      .where(
        and(
          eq(embeddings.tenantId, tenantId),
          eq(embeddings.type, 'lead_behavior'),
          sql`${embeddings.sourceId} != ${leadId}`
        )
      )
      .orderBy(sql`${embeddings.embedding} <=> ${sourceEmbedding.embedding}::vector`)
      .limit(limit);

    return similar.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      sourceText: row.sourceText,
      similarity: row.similarity,
      metadata: row.metadata as Record<string, unknown>,
    }));
  }

  /**
   * Semantic search across all lead behaviors.
   */
  async searchLeads(
    tenantId: string,
    query: string,
    limit = 10
  ): Promise<SimilarityResult[]> {
    // Generate embedding for query
    const queryResult = await this.provider.embed({ text: query });

    // Search using cosine similarity
    const results = await db
      .select({
        id: embeddings.id,
        sourceId: embeddings.sourceId,
        sourceText: embeddings.sourceText,
        similarity: sql<number>`1 - (${embeddings.embedding} <=> ${queryResult.embedding}::vector)`,
        metadata: embeddings.metadata,
      })
      .from(embeddings)
      .where(
        and(
          eq(embeddings.tenantId, tenantId),
          eq(embeddings.type, 'lead_behavior')
        )
      )
      .orderBy(sql`${embeddings.embedding} <=> ${queryResult.embedding}::vector`)
      .limit(limit);

    return results.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      sourceText: row.sourceText,
      similarity: row.similarity,
      metadata: row.metadata as Record<string, unknown>,
    }));
  }

  /**
   * Builds a natural language behavioral summary for a lead.
   */
  private async buildBehavioralSummary(
    tenantId: string,
    lead: LeadRecord
  ): Promise<string> {
    // Fetch page views
    const views = await db
      .select()
      .from(pageViews)
      .where(
        and(
          eq(pageViews.tenantId, tenantId),
          eq(pageViews.visitorId, lead.visitorId)
        )
      )
      .orderBy(desc(pageViews.viewedAt))
      .limit(20);

    // Fetch attributions
    const attrs = await db
      .select()
      .from(attributions)
      .where(
        and(
          eq(attributions.tenantId, tenantId),
          eq(attributions.visitorId, lead.visitorId)
        )
      )
      .orderBy(desc(attributions.capturedAt))
      .limit(5);

    // Build summary components
    const parts: string[] = [];

    // Lead info
    parts.push(`Lead: ${lead.email}`);
    if (lead.name) parts.push(`Name: ${lead.name}`);
    if (lead.enrichedCompany || lead.company) {
      parts.push(`Company: ${lead.enrichedCompany ?? lead.company}`);
    }
    parts.push(`Score: ${lead.score}`);

    // Attribution info
    if (attrs.length > 0) {
      const sources = [...new Set(attrs.map((a) => a.utmSource).filter(Boolean))];
      const campaigns = [...new Set(attrs.map((a) => a.utmCampaign).filter(Boolean))];

      if (sources.length > 0) {
        parts.push(`Traffic sources: ${sources.join(', ')}`);
      }
      if (campaigns.length > 0) {
        parts.push(`Campaigns: ${campaigns.join(', ')}`);
      }
    }

    // Page view behavior
    if (views.length > 0) {
      const uniquePaths = [...new Set(views.map((v) => v.path))];
      const highValueViews = views.filter((v) => v.isHighValue);

      parts.push(`Pages viewed: ${uniquePaths.length}`);
      parts.push(`Page paths: ${uniquePaths.slice(0, 5).join(', ')}`);

      if (highValueViews.length > 0) {
        parts.push(`High-intent pages viewed: ${highValueViews.length}`);
        parts.push(
          `Intent pages: ${[...new Set(highValueViews.map((v) => v.path))].join(', ')}`
        );
      }

      // Engagement indicators
      const avgDuration =
        views.reduce((sum, v) => sum + (v.duration ?? 0), 0) / views.length;
      if (avgDuration > 0) {
        parts.push(`Average time on page: ${Math.round(avgDuration)}s`);
      }
    }

    return parts.join('. ');
  }

  /**
   * Gets the configured provider info.
   */
  getProviderInfo(): { name: string; model: string; dimensions: number } {
    return {
      name: this.provider.providerName,
      model: this.provider.modelName,
      dimensions: this.provider.dimensions,
    };
  }
}

export const embeddingService = new EmbeddingService();
