/**
 * Repository Interfaces
 * Abstractions for data persistence - enables dependency inversion.
 * Infrastructure layer implements these; application layer depends on them.
 */

import type {
  Visitor,
  CreateVisitorInput,
  Attribution,
  CreateAttributionInput,
  Lead,
  CreateLeadInput,
} from '../entities';

export interface IVisitorRepository {
  findById(id: string): Promise<Visitor | null>;
  findByUuid(visitorUuid: string): Promise<Visitor | null>;
  create(input: CreateVisitorInput): Promise<Visitor>;
  updateLastSeen(id: string): Promise<Visitor>;
}

export interface IAttributionRepository {
  findById(id: string): Promise<Attribution | null>;
  findByVisitorId(visitorId: string): Promise<Attribution[]>;
  create(input: CreateAttributionInput): Promise<Attribution>;
  createMany(inputs: CreateAttributionInput[]): Promise<Attribution[]>;
}

export interface ILeadRepository {
  findById(id: string): Promise<Lead | null>;
  findByEmail(email: string): Promise<Lead | null>;
  findByVisitorId(visitorId: string): Promise<Lead[]>;
  create(input: CreateLeadInput): Promise<Lead>;
}

/**
 * Transaction context for atomic operations across multiple repositories.
 * Implementations should wrap Drizzle transactions.
 */
export interface ITransactionContext {
  visitor: IVisitorRepository;
  attribution: IAttributionRepository;
  lead: ILeadRepository;
}

export interface IUnitOfWork {
  transaction<T>(work: (ctx: ITransactionContext) => Promise<T>): Promise<T>;
}
