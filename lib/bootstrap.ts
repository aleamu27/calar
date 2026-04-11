/**
 * Application Bootstrap
 * Initializes all services and registers integration observers.
 * Call this during application startup.
 */

import { registerDefaultIntegrations } from './infrastructure/integrations';

let initialized = false;

/**
 * Bootstraps the Hepta Analytics platform.
 * Safe to call multiple times - will only initialize once.
 */
export function bootstrap(): void {
  if (initialized) {
    return;
  }

  console.log('[Bootstrap] Initializing Hepta Analytics...');

  // Register integration observers
  registerDefaultIntegrations();

  // Log configuration
  console.log('[Bootstrap] Configuration:', {
    environment: process.env.NODE_ENV,
    enrichment: {
      clearbit: Boolean(process.env.CLEARBIT_API_KEY),
      abstractApi: Boolean(process.env.ABSTRACTAPI_KEY),
    },
    signals: {
      resend: Boolean(process.env.RESEND_API_KEY),
    },
    embeddings: {
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
  });

  initialized = true;
  console.log('[Bootstrap] Initialization complete');
}

/**
 * Checks if the application has been bootstrapped.
 */
export function isBootstrapped(): boolean {
  return initialized;
}
