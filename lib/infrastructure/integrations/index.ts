/**
 * Integration Observer Exports
 * Auto-registers all observers with the integration service.
 */

import { integrationService } from '../../application/services/integration.service';
import { HubSpotIntegrationObserver } from './hubspot.integration';
import { WebhookIntegrationObserver } from './webhook.integration';
import { SlackIntegrationObserver } from './slack.integration';

// Export individual observers
export { HubSpotIntegrationObserver } from './hubspot.integration';
export { WebhookIntegrationObserver } from './webhook.integration';
export { SlackIntegrationObserver } from './slack.integration';

/**
 * Registers all default integration observers.
 * Call this during application startup.
 */
export function registerDefaultIntegrations(): void {
  integrationService.register(new HubSpotIntegrationObserver());
  integrationService.register(new WebhookIntegrationObserver());
  integrationService.register(new SlackIntegrationObserver());

  console.log('[Integrations] Registered default observers:',
    integrationService.getRegisteredTypes()
  );
}
