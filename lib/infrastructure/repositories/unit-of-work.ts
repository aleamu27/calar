/**
 * Unit of Work
 * Manages database transactions across multiple repositories.
 * Ensures atomic operations for complex business workflows.
 */

import type { IUnitOfWork, ITransactionContext } from '../../core/interfaces';
import { db, type Database } from '../db/client';
import { VisitorRepository } from './visitor.repository';
import { AttributionRepository } from './attribution.repository';
import { LeadRepository } from './lead.repository';

export class UnitOfWork implements IUnitOfWork {
  constructor(private readonly database: Database = db) {}

  async transaction<T>(
    work: (ctx: ITransactionContext) => Promise<T>
  ): Promise<T> {
    return this.database.transaction(async (tx) => {
      const context: ITransactionContext = {
        visitor: new VisitorRepository(tx as unknown as Database),
        attribution: new AttributionRepository(tx as unknown as Database),
        lead: new LeadRepository(tx as unknown as Database),
      };

      return work(context);
    });
  }
}

// Default instance for convenience
export const unitOfWork = new UnitOfWork();
