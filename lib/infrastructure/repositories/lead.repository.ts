/**
 * Lead Repository
 * Concrete implementation of ILeadRepository using Drizzle ORM.
 */

import { eq, and } from 'drizzle-orm';
import type { ILeadRepository } from '../../core/interfaces';
import type { Lead, CreateLeadInput } from '../../core/entities';
import { leads } from '../db/schema';
import type { Database } from '../db/client';
import { requireTenantContext } from '../../core/context/tenant.context';

export class LeadRepository implements ILeadRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Lead | null> {
    const tenant = requireTenantContext();
    const result = await this.db.query.leads.findFirst({
      where: and(eq(leads.id, id), eq(leads.tenantId, tenant.id)),
    });
    return result ?? null;
  }

  async findByEmail(email: string): Promise<Lead | null> {
    const tenant = requireTenantContext();
    const normalizedEmail = email.toLowerCase().trim();
    const result = await this.db.query.leads.findFirst({
      where: and(eq(leads.email, normalizedEmail), eq(leads.tenantId, tenant.id)),
    });
    return result ?? null;
  }

  async findByVisitorId(visitorId: string): Promise<Lead[]> {
    const tenant = requireTenantContext();
    return this.db.query.leads.findMany({
      where: and(eq(leads.visitorId, visitorId), eq(leads.tenantId, tenant.id)),
    });
  }

  async create(input: CreateLeadInput): Promise<Lead> {
    const tenant = requireTenantContext();
    const [result] = await this.db
      .insert(leads)
      .values({
        tenantId: tenant.id,
        visitorId: input.visitorId,
        email: input.email.toLowerCase().trim(),
        name: input.name ?? null,
        company: input.company ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: input.metadata ?? null,
      })
      .returning();

    return result;
  }
}
