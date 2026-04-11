/**
 * Lead Repository
 * Concrete implementation of ILeadRepository using Drizzle ORM.
 */

import { eq } from 'drizzle-orm';
import type { ILeadRepository } from '../../core/interfaces';
import type { Lead, CreateLeadInput } from '../../core/entities';
import { leads } from '../db/schema';
import type { Database } from '../db/client';

export class LeadRepository implements ILeadRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Lead | null> {
    const result = await this.db.query.leads.findFirst({
      where: eq(leads.id, id),
    });
    return result ?? null;
  }

  async findByEmail(email: string): Promise<Lead | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const result = await this.db.query.leads.findFirst({
      where: eq(leads.email, normalizedEmail),
    });
    return result ?? null;
  }

  async findByVisitorId(visitorId: string): Promise<Lead[]> {
    return this.db.query.leads.findMany({
      where: eq(leads.visitorId, visitorId),
    });
  }

  async create(input: CreateLeadInput): Promise<Lead> {
    const [result] = await this.db
      .insert(leads)
      .values({
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
