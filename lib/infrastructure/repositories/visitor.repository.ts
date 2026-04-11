/**
 * Visitor Repository
 * Concrete implementation of IVisitorRepository using Drizzle ORM.
 */

import { eq } from 'drizzle-orm';
import type { IVisitorRepository } from '../../core/interfaces';
import type { Visitor, CreateVisitorInput } from '../../core/entities';
import { visitors } from '../db/schema';
import type { Database } from '../db/client';

export class VisitorRepository implements IVisitorRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Visitor | null> {
    const result = await this.db.query.visitors.findFirst({
      where: eq(visitors.id, id),
    });
    return result ?? null;
  }

  async findByUuid(visitorUuid: string): Promise<Visitor | null> {
    const result = await this.db.query.visitors.findFirst({
      where: eq(visitors.visitorUuid, visitorUuid),
    });
    return result ?? null;
  }

  async create(input: CreateVisitorInput): Promise<Visitor> {
    const [result] = await this.db
      .insert(visitors)
      .values({
        visitorUuid: input.visitorUuid,
      })
      .returning();

    return result;
  }

  async updateLastSeen(id: string): Promise<Visitor> {
    const [result] = await this.db
      .update(visitors)
      .set({ lastSeenAt: new Date() })
      .where(eq(visitors.id, id))
      .returning();

    return result;
  }
}
