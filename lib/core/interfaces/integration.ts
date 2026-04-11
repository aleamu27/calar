/**
 * Integration Interfaces
 * Observer pattern contracts for the integration engine.
 */

import type { LeadRecord, IntegrationRecord } from '../../infrastructure/db/schema';

/**
 * Event types that can trigger integrations.
 */
export type IntegrationEventType =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.score_changed'
  | 'lead.enriched'
  | 'signal.triggered';

/**
 * Event payload passed to integration observers.
 */
export interface IntegrationEvent {
  type: IntegrationEventType;
  tenantId: string;
  timestamp: Date;
  data: IntegrationEventData;
}

export interface IntegrationEventData {
  lead: LeadRecord;
  previousScore?: number;
  triggeredSignal?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of an integration action.
 */
export interface IntegrationResult {
  success: boolean;
  integrationId: string;
  integrationType: string;
  action: string;
  externalId?: string;
  error?: string;
  durationMs: number;
  retryable: boolean;
}

/**
 * Observer interface for integration handlers.
 * Each integration type implements this interface.
 */
export interface IIntegrationObserver {
  /**
   * Unique identifier for this integration type.
   */
  readonly integrationType: string;

  /**
   * Event types this observer is interested in.
   */
  readonly subscribedEvents: IntegrationEventType[];

  /**
   * Checks if this observer should handle the event.
   */
  shouldHandle(event: IntegrationEvent, integration: IntegrationRecord): boolean;

  /**
   * Handles the integration event.
   * Returns result of the integration action.
   */
  handle(event: IntegrationEvent, integration: IntegrationRecord): Promise<IntegrationResult>;

  /**
   * Validates integration configuration.
   */
  validateConfig(integration: IntegrationRecord): boolean;
}

/**
 * Integration dispatcher manages all observers.
 */
export interface IIntegrationDispatcher {
  /**
   * Registers an integration observer.
   */
  register(observer: IIntegrationObserver): void;

  /**
   * Unregisters an integration observer.
   */
  unregister(integrationType: string): void;

  /**
   * Dispatches an event to all relevant observers.
   */
  dispatch(event: IntegrationEvent): Promise<IntegrationResult[]>;

  /**
   * Gets all registered observer types.
   */
  getRegisteredTypes(): string[];
}
