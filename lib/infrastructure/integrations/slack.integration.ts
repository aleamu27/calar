/**
 * Slack Integration Observer
 * Posts lead notifications to Slack channels.
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
  EncryptedCredentials,
} from '../db/schema';

const DEFAULT_SCORE_THRESHOLD = 50;

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text?: { type: string; text: string };
    url?: string;
  }>;
}

export class SlackIntegrationObserver implements IIntegrationObserver {
  readonly integrationType = 'slack';
  readonly subscribedEvents: IntegrationEventType[] = [
    'lead.created',
    'lead.score_changed',
    'signal.triggered',
  ];

  shouldHandle(event: IntegrationEvent, integration: IntegrationRecord): boolean {
    const conditions = integration.triggerConditions as TriggerConditions | null;
    const threshold = conditions?.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;

    // Only notify for high-scoring leads
    return event.data.lead.score > threshold;
  }

  validateConfig(integration: IntegrationRecord): boolean {
    const credentials = integration.credentials as EncryptedCredentials | null;

    if (!credentials?.accessToken) {
      console.warn(`[Slack] Integration ${integration.id} missing webhook URL`);
      return false;
    }

    return true;
  }

  async handle(
    event: IntegrationEvent,
    integration: IntegrationRecord
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const credentials = integration.credentials as EncryptedCredentials;

    const blocks = this.buildSlackBlocks(event, integration);

    try {
      const response = await fetch(credentials.accessToken!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocks }),
        signal: AbortSignal.timeout(10000),
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} - ${errorText}`);
      }

      console.log('[Slack] Notification sent:', {
        integrationId: integration.id,
        eventType: event.type,
        leadScore: event.data.lead.score,
        durationMs,
      });

      return {
        success: true,
        integrationId: integration.id,
        integrationType: this.integrationType,
        action: 'send_notification',
        durationMs,
        retryable: false,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[Slack] Notification failed:', {
        integrationId: integration.id,
        error: errorMessage,
        durationMs,
      });

      return {
        success: false,
        integrationId: integration.id,
        integrationType: this.integrationType,
        action: 'send_notification',
        error: errorMessage,
        durationMs,
        retryable: true,
      };
    }
  }

  private buildSlackBlocks(
    event: IntegrationEvent,
    integration: IntegrationRecord
  ): SlackBlock[] {
    const lead = event.data.lead;
    const scoreEmoji = lead.score >= 75 ? ':fire:' : lead.score >= 50 ? ':star:' : ':eyes:';

    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${scoreEmoji} New High-Intent Lead`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Email:*\n${lead.email}`,
          },
          {
            type: 'mrkdwn',
            text: `*Score:*\n${lead.score}`,
          },
          {
            type: 'mrkdwn',
            text: `*Name:*\n${lead.name ?? 'Not provided'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Company:*\n${lead.enrichedCompany ?? lead.company ?? 'Unknown'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Event:* ${this.formatEventType(event.type)}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View in Dashboard',
            },
            url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.hepta.io'}/dashboard/leads/${lead.id}`,
          },
        ],
      },
    ];
  }

  private formatEventType(type: IntegrationEventType): string {
    const formats: Record<IntegrationEventType, string> = {
      'lead.created': 'New Lead Created',
      'lead.updated': 'Lead Updated',
      'lead.score_changed': 'Score Changed',
      'lead.enriched': 'Lead Enriched',
      'signal.triggered': 'Signal Triggered',
    };
    return formats[type] ?? type;
  }
}
