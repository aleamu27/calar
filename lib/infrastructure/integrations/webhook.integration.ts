/**
 * Generic Webhook Integration Observer
 * Sends lead data to custom webhook endpoints.
 */

import type {
  IIntegrationObserver,
  IntegrationEvent,
  IntegrationEventType,
  IntegrationResult,
} from '../../core/interfaces/integration';
import type {
  IntegrationRecord,
  TriggerConditions,
  IntegrationConfig,
  EncryptedCredentials,
} from '../db/schema';

export class WebhookIntegrationObserver implements IIntegrationObserver {
  readonly integrationType = 'webhook';
  readonly subscribedEvents: IntegrationEventType[] = [
    'lead.created',
    'lead.updated',
    'lead.score_changed',
    'lead.enriched',
    'signal.triggered',
  ];

  shouldHandle(event: IntegrationEvent, integration: IntegrationRecord): boolean {
    const conditions = integration.triggerConditions as TriggerConditions | null;

    // Check if specific events are configured
    if (conditions?.events && conditions.events.length > 0) {
      if (!conditions.events.includes(event.type)) {
        return false;
      }
    }

    // Check score threshold if configured
    if (conditions?.scoreThreshold) {
      if (event.data.lead.score < conditions.scoreThreshold) {
        return false;
      }
    }

    return true;
  }

  validateConfig(integration: IntegrationRecord): boolean {
    const config = integration.config as IntegrationConfig | null;

    if (!config?.endpoint) {
      console.warn(`[Webhook] Integration ${integration.id} missing endpoint`);
      return false;
    }

    // Validate URL format
    try {
      new URL(config.endpoint);
      return true;
    } catch {
      console.warn(`[Webhook] Integration ${integration.id} has invalid endpoint URL`);
      return false;
    }
  }

  async handle(
    event: IntegrationEvent,
    integration: IntegrationRecord
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const config = integration.config as IntegrationConfig;
    const credentials = integration.credentials as EncryptedCredentials | null;

    const payload = this.buildPayload(event, integration);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Hepta-Webhook/1.0',
        'X-Hepta-Event': event.type,
        'X-Hepta-Tenant': event.tenantId,
      };

      // Add API key if configured
      if (credentials?.apiKey) {
        headers['Authorization'] = `Bearer ${credentials.apiKey}`;
      }

      const response = await fetch(config.endpoint!, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30s timeout for webhooks
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new WebhookError(
          `Webhook returned ${response.status}: ${errorText}`,
          response.status
        );
      }

      console.log('[Webhook] Delivery successful:', {
        integrationId: integration.id,
        endpoint: this.maskUrl(config.endpoint!),
        eventType: event.type,
        durationMs,
      });

      return {
        success: true,
        integrationId: integration.id,
        integrationType: this.integrationType,
        action: 'webhook_delivery',
        durationMs,
        retryable: false,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[Webhook] Delivery failed:', {
        integrationId: integration.id,
        endpoint: this.maskUrl(config.endpoint!),
        error: errorMessage,
        durationMs,
      });

      return {
        success: false,
        integrationId: integration.id,
        integrationType: this.integrationType,
        action: 'webhook_delivery',
        error: errorMessage,
        durationMs,
        retryable: this.isRetryableError(error),
      };
    }
  }

  private buildPayload(
    event: IntegrationEvent,
    integration: IntegrationRecord
  ): Record<string, unknown> {
    const lead = event.data.lead;

    return {
      event: event.type,
      timestamp: event.timestamp.toISOString(),
      integration: {
        id: integration.id,
        name: integration.name,
      },
      lead: {
        id: lead.id,
        email: lead.email,
        name: lead.name,
        company: lead.company ?? lead.enrichedCompany,
        score: lead.score,
        convertedAt: lead.convertedAt,
        metadata: lead.metadata,
      },
      context: {
        previousScore: event.data.previousScore,
        triggeredSignal: event.data.triggeredSignal,
      },
    };
  }

  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return '[invalid url]';
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof WebhookError) {
      return error.statusCode === 429 || error.statusCode >= 500;
    }
    return true;
  }
}

class WebhookError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}
