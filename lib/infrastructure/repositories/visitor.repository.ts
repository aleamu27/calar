/**
 * Visitor Repository
 * Concrete implementation of IVisitorRepository using Drizzle ORM.
 */

import { eq, and } from 'drizzle-orm';
import type { IVisitorRepository } from '../../core/interfaces';
import type { Visitor, CreateVisitorInput } from '../../core/entities';
import { visitors } from '../db/schema';
import type { Database } from '../db/client';
import { requireTenantContext } from '../../core/context/tenant.context';

export class VisitorRepository implements IVisitorRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Visitor | null> {
    const tenant = requireTenantContext();
    const result = await this.db.query.visitors.findFirst({
      where: and(eq(visitors.id, id), eq(visitors.tenantId, tenant.id)),
    });
    return result ?? null;
  }

  async findByUuid(visitorUuid: string): Promise<Visitor | null> {
    const tenant = requireTenantContext();
    const result = await this.db.query.visitors.findFirst({
      where: and(eq(visitors.visitorUuid, visitorUuid), eq(visitors.tenantId, tenant.id)),
    });
    return result ?? null;
  }

  async create(input: CreateVisitorInput): Promise<Visitor> {
    const tenant = requireTenantContext();
    const [result] = await this.db
      .insert(visitors)
      .values({
        tenantId: tenant.id,
        visitorUuid: input.visitorUuid,
      })
      .returning();

    return result;
  }

  async updateLastSeen(id: string): Promise<Visitor> {
    const tenant = requireTenantContext();
    const [result] = await this.db
      .update(visitors)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(visitors.id, id), eq(visitors.tenantId, tenant.id)))
      .returning();

    return result;
  }
}
