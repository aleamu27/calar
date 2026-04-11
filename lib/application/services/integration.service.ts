/**
 * Integration Service
 * Dispatcher that manages integration observers using the Observer pattern.
 * Handles async dispatch and logging of all integration attempts.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../infrastructure/db/client';
import { integrations, integrationLogs, leads } from '../../infrastructure/db/schema';
import type {
  IIntegrationDispatcher,
  IIntegrationObserver,
  IntegrationEvent,
  IntegrationEventType,
  IntegrationResult,
} from '../../core/interfaces/integration';
import type { IntegrationRecord, LeadRecord } from '../../infrastructure/db/schema';

export class IntegrationService implements IIntegrationDispatcher {
  private observers: Map<string, IIntegrationObserver> = new Map();

  /**
   * Registers an integration observer.
   */
  register(observer: IIntegrationObserver): void {
    this.observers.set(observer.integrationType, observer);
    console.log(`[IntegrationService] Registered observer: ${observer.integrationType}`);
  }

  /**
   * Unregisters an integration observer.
   */
  unregister(integrationType: string): void {
    this.observers.delete(integrationType);
    console.log(`[IntegrationService] Unregistered observer: ${integrationType}`);
  }

  /**
   * Gets all registered observer types.
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.observers.keys());
  }

  /**
   * Dispatches an event to all relevant observers.
   * Fetches active integrations for the tenant and routes to appropriate handlers.
   */
  async dispatch(event: IntegrationEvent): Promise<IntegrationResult[]> {
    const results: IntegrationResult[] = [];

    // Fetch active integrations for this tenant
    const activeIntegrations = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.tenantId, event.tenantId),
          eq(integrations.status, 'active')
        )
      );

    if (activeIntegrations.length === 0) {
      return results;
    }

    // Route to appropriate observers
    for (const integration of activeIntegrations) {
      const observer = this.observers.get(integration.type);

      if (!observer) {
        continue;
      }

      // Check if observer handles this event type
      if (!observer.subscribedEvents.includes(event.type)) {
        continue;
      }

      // Check trigger conditions
      if (!observer.shouldHandle(event, integration)) {
        continue;
      }

      // Validate configuration
      if (!observer.validateConfig(integration)) {
        await this.logIntegrationAttempt(event, integration, {
          success: false,
          integrationId: integration.id,
          integrationType: integration.type,
          action: 'validation',
          error: 'Invalid integration configuration',
          durationMs: 0,
          retryable: false,
        });
        continue;
      }

      // Execute integration handler
      try {
        const result = await observer.handle(event, integration);
        results.push(result);

        // Log the attempt
        await this.logIntegrationAttempt(event, integration, result);

        // Update integration status if error
        if (!result.success && !result.retryable) {
          await this.updateIntegrationStatus(integration.id, 'error', result.error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const result: IntegrationResult = {
          success: false,
          integrationId: integration.id,
          integrationType: integration.type,
          action: 'handle',
          error: errorMessage,
          durationMs: 0,
          retryable: true,
        };
        results.push(result);

        await this.logIntegrationAttempt(event, integration, result);

        console.error(`[IntegrationService] Observer error for ${integration.type}:`, error);
      }
    }

    return results;
  }

  /**
   * Dispatches event asynchronously (fire-and-forget).
   * Used when you don't need to wait for results.
   */
  dispatchAsync(event: IntegrationEvent): void {
    // Use setImmediate to ensure non-blocking
    setImmediate(() => {
      this.dispatch(event).catch((error) => {
        console.error('[IntegrationService] Async dispatch error:', error);
      });
    });
  }

  /**
   * Creates and dispatches a lead event.
   */
  async dispatchLeadEvent(
    type: IntegrationEventType,
    tenantId: string,
    lead: LeadRecord,
    metadata?: Record<string, unknown>
  ): Promise<IntegrationResult[]> {
    const event: IntegrationEvent = {
      type,
      tenantId,
      timestamp: new Date(),
      data: {
        lead,
        metadata,
      },
    };

    return this.dispatch(event);
  }

  /**
   * Logs an integration attempt.
   */
  private async logIntegrationAttempt(
    event: IntegrationEvent,
    integration: IntegrationRecord,
    result: IntegrationResult
  ): Promise<void> {
    try {
      await db.insert(integrationLogs).values({
        tenantId: event.tenantId,
        integrationId: integration.id,
        leadId: event.data.lead.id,
        action: result.action,
        status: result.success ? 'success' : 'failed',
        responseStatus: result.success ? 200 : 500,
        errorMessage: result.error,
        durationMs: result.durationMs,
        requestPayload: {
          eventType: event.type,
          leadEmail: event.data.lead.email,
          leadScore: event.data.lead.score,
        },
        responsePayload: result.externalId ? { externalId: result.externalId } : null,
      });
    } catch (error) {
      console.error('[IntegrationService] Failed to log integration attempt:', error);
    }
  }

  /**
   * Updates integration status.
   */
  private async updateIntegrationStatus(
    integrationId: string,
    status: 'active' | 'paused' | 'error' | 'disconnected',
    errorMessage?: string
  ): Promise<void> {
    await db
      .update(integrations)
      .set({
        status,
        errorMessage: errorMessage ?? null,
      })
      .where(eq(integrations.id, integrationId));
  }
}

/**
 * Singleton integration service instance.
 */
export const integrationService = new IntegrationService();
