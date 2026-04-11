/**
 * Attribution Repository
 * Concrete implementation of IAttributionRepository using Drizzle ORM.
 */

import { eq, desc } from 'drizzle-orm';
import type { IAttributionRepository } from '../../core/interfaces';
import type { Attribution, CreateAttributionInput } from '../../core/entities';
import { attributions } from '../db/schema';
import type { Database } from '../db/client';

export class AttributionRepository implements IAttributionRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Attribution | null> {
    const result = await this.db.query.attributions.findFirst({
      where: eq(attributions.id, id),
    });
    return result ?? null;
  }

  async findByVisitorId(visitorId: string): Promise<Attribution[]> {
    return this.db.query.attributions.findMany({
      where: eq(attributions.visitorId, visitorId),
      orderBy: desc(attributions.capturedAt),
    });
  }

  async create(input: CreateAttributionInput): Promise<Attribution> {
    const [result] = await this.db
      .insert(attributions)
      .values({
        visitorId: input.visitorId,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmTerm: input.utmTerm ?? null,
        utmContent: input.utmContent ?? null,
        referrer: input.referrer ?? null,
        landingPage: input.landingPage ?? null,
      })
      .returning();

    return result;
  }

  async createMany(inputs: CreateAttributionInput[]): Promise<Attribution[]> {
    if (inputs.length === 0) return [];

    return this.db
      .insert(attributions)
      .values(
        inputs.map((input) => ({
          visitorId: input.visitorId,
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmTerm: input.utmTerm ?? null,
          utmContent: input.utmContent ?? null,
          referrer: input.referrer ?? null,
          landingPage: input.landingPage ?? null,
        }))
      )
      .returning();
  }
}
