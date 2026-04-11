/**
 * Attribution Repository
 * Concrete implementation of IAttributionRepository using Drizzle ORM.
 */

import { eq, desc, and } from 'drizzle-orm';
import type { IAttributionRepository } from '../../core/interfaces';
import type { Attribution, CreateAttributionInput } from '../../core/entities';
import { attributions } from '../db/schema';
import type { Database } from '../db/client';
import { requireTenantContext } from '../../core/context/tenant.context';

export class AttributionRepository implements IAttributionRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Attribution | null> {
    const tenant = requireTenantContext();
    const result = await this.db.query.attributions.findFirst({
      where: and(eq(attributions.id, id), eq(attributions.tenantId, tenant.id)),
    });
    return result ?? null;
  }

  async findByVisitorId(visitorId: string): Promise<Attribution[]> {
    const tenant = requireTenantContext();
    return this.db.query.attributions.findMany({
      where: and(eq(attributions.visitorId, visitorId), eq(attributions.tenantId, tenant.id)),
      orderBy: desc(attributions.capturedAt),
    });
  }

  async create(input: CreateAttributionInput): Promise<Attribution> {
    const tenant = requireTenantContext();
    const [result] = await this.db
      .insert(attributions)
      .values({
        tenantId: tenant.id,
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

    const tenant = requireTenantContext();
    return this.db
      .insert(attributions)
      .values(
        inputs.map((input) => ({
          tenantId: tenant.id,
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
