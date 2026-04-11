/**
 * HubSpot Integration Observer
 * Syncs high-scoring leads to HubSpot CRM.
 * Triggers when lead score exceeds configured threshold (default: 75).
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

const DEFAULT_SCORE_THRESHOLD = 75;

interface HubSpotContactPayload {
  properties: Record<string, string>;
}

interface HubSpotContactResponse {
  id: string;
  properties: Record<string, string>;
}

export class HubSpotIntegrationObserver implements IIntegrationObserver {
  readonly integrationType = 'hubspot';
  readonly subscribedEvents: IntegrationEventType[] = [
    'lead.created',
    'lead.score_changed',
    'lead.enriched',
  ];

  /**
   * Determines if this integration should handle the event.
   * Checks score threshold from trigger conditions.
   */
  shouldHandle(event: IntegrationEvent, integration: IntegrationRecord): boolean {
    const conditions = integration.triggerConditions as TriggerConditions | null;
    const threshold = conditions?.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;

    const leadScore = event.data.lead.score;

    // Only sync if score exceeds threshold
    if (leadScore <= threshold) {
      return false;
    }

    // For score_changed events, only trigger if crossing threshold
    if (event.type === 'lead.score_changed') {
      const previousScore = event.data.previousScore ?? 0;
      if (previousScore > threshold) {
        // Already synced before
        return false;
      }
    }

    return true;
  }

  /**
   * Validates HubSpot integration configuration.
   */
  validateConfig(integration: IntegrationRecord): boolean {
    const credentials = integration.credentials as EncryptedCredentials | null;

    if (!credentials?.accessToken) {
      console.warn(`[HubSpot] Integration ${integration.id} missing access token`);
      return false;
    }

    return true;
  }

  /**
   * Handles the integration event - creates/updates contact in HubSpot.
   */
  async handle(
    event: IntegrationEvent,
    integration: IntegrationRecord
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const credentials = integration.credentials as EncryptedCredentials;
    const config = integration.config as IntegrationConfig | null;

    const lead = event.data.lead;

    // Check if lead already has HubSpot ID
    const existingHubSpotId = lead.externalIds?.hubspotId;

    try {
      let result: { id: string };

      if (existingHubSpotId) {
        // Update existing contact
        result = await this.updateContact(
          credentials.accessToken!,
          existingHubSpotId,
          this.buildContactPayload(lead, config)
        );
      } else {
        // Create new contact
        result = await this.createContact(
          credentials.accessToken!,
          this.buildContactPayload(lead, config)
        );
      }

      const durationMs = Date.now() - startTime;

      console.log(
        `[HubSpot] Successfully ${existingHubSpotId ? 'updated' : 'created'} contact:`,
        {
          leadId: lead.id,
          hubspotId: result.id,
          score: lead.score,
          durationMs,
        }
      );

      return {
        success: true,
        integrationId: integration.id,
        integrationType: this.integrationType,
        action: existingHubSpotId ? 'update_contact' : 'create_contact',
        externalId: result.id,
        durationMs,
        retryable: false,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[HubSpot] Contact sync failed:', {
        leadId: lead.id,
        error: errorMessage,
        durationMs,
      });

      return {
        success: false,
        integrationId: integration.id,
        integrationType: this.integrationType,
        action: existingHubSpotId ? 'update_contact' : 'create_contact',
        error: errorMessage,
        durationMs,
        retryable: this.isRetryableError(error),
      };
    }
  }

  /**
   * Creates a contact in HubSpot.
   */
  private async createContact(
    accessToken: string,
    payload: HubSpotContactPayload
  ): Promise<HubSpotContactResponse> {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new HubSpotApiError(
        `HubSpot API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Updates a contact in HubSpot.
   */
  private async updateContact(
    accessToken: string,
    contactId: string,
    payload: HubSpotContactPayload
  ): Promise<HubSpotContactResponse> {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new HubSpotApiError(
        `HubSpot API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  /**
   * Builds HubSpot contact payload from lead data.
   */
  private buildContactPayload(
    lead: IntegrationEvent['data']['lead'],
    config: IntegrationConfig | null
  ): HubSpotContactPayload {
    const fieldMappings = config?.fieldMappings ?? {};

    const properties: Record<string, string> = {
      email: lead.email,
    };

    // Standard mappings
    if (lead.name) {
      const nameParts = lead.name.split(' ');
      properties.firstname = nameParts[0];
      properties.lastname = nameParts.slice(1).join(' ') || nameParts[0];
    }

    if (lead.company || lead.enrichedCompany) {
      properties.company = lead.enrichedCompany ?? lead.company ?? '';
    }

    // Custom property for lead score
    properties.hepta_lead_score = String(lead.score);

    // Apply custom field mappings
    for (const [heptaField, hubspotField] of Object.entries(fieldMappings)) {
      const value = this.getFieldValue(lead, heptaField);
      if (value !== null) {
        properties[hubspotField] = String(value);
      }
    }

    return { properties };
  }

  /**
   * Gets field value from lead using dot notation.
   */
  private getFieldValue(lead: Record<string, unknown>, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = lead;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * Determines if error is retryable.
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof HubSpotApiError) {
      // Rate limits and server errors are retryable
      return error.statusCode === 429 || error.statusCode >= 500;
    }
    // Network errors are retryable
    return true;
  }
}

/**
 * HubSpot-specific API error.
 */
class HubSpotApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseData?: unknown
  ) {
    super(message);
    this.name = 'HubSpotApiError';
  }
}
