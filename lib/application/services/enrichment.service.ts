/**
 * Enrichment Service
 * Orchestrates company data enrichment across multiple providers.
 * Uses strategy pattern for provider selection and fallback.
 */

import type {
  ICompanyEnricher,
  EnrichmentInput,
  EnrichmentResult,
} from '../../core/interfaces/enrichment';
import {
  MockCompanyEnricher,
  ClearbitCompanyEnricher,
  AbstractApiEnricher,
} from '../../infrastructure/enrichment';

export interface EnrichmentServiceConfig {
  useMock: boolean;
  providers: ICompanyEnricher[];
}

export class EnrichmentService {
  private readonly providers: ICompanyEnricher[];

  constructor(config?: Partial<EnrichmentServiceConfig>) {
    if (config?.providers && config.providers.length > 0) {
      this.providers = config.providers;
    } else if (config?.useMock || process.env.NODE_ENV === 'development') {
      this.providers = [new MockCompanyEnricher()];
    } else {
      // Production: prioritize Clearbit, fallback to AbstractAPI, then mock
      this.providers = [
        new ClearbitCompanyEnricher(),
        new AbstractApiEnricher(),
        new MockCompanyEnricher(),
      ];
    }
  }

  /**
   * Attempts to enrich company data using available providers.
   * Tries providers in order until one succeeds.
   */
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!provider.canHandle(input)) {
        continue;
      }

      try {
        const result = await provider.enrich(input);

        if (result.success) {
          return result;
        }

        // Provider returned but didn't find data - try next
        errors.push(`${provider.providerName}: ${result.raw?.reason ?? 'No data'}`);
      } catch (error) {
        // Provider threw an error - try next
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider.providerName}: ${message}`);
      }
    }

    // All providers failed
    return {
      success: false,
      companyName: null,
      domain: null,
      industry: null,
      employeeCount: null,
      location: null,
      confidence: 0,
      provider: 'none',
      raw: { errors },
    };
  }

  /**
   * Returns list of available provider names.
   */
  getAvailableProviders(): string[] {
    return this.providers.map((p) => p.providerName);
  }

  /**
   * Registers an additional enrichment provider.
   * New providers are added to the end of the chain.
   */
  registerProvider(provider: ICompanyEnricher): void {
    this.providers.push(provider);
  }

  /**
   * Creates an EnrichmentInput from lead data.
   */
  static createInput(data: {
    email?: string;
    ipAddress?: string;
    domain?: string;
  }): EnrichmentInput {
    return {
      email: data.email,
      ipAddress: data.ipAddress,
      domain: data.domain ?? (data.email ? data.email.split('@')[1] : undefined),
    };
  }
}

/**
 * Default service instance.
 */
export const enrichmentService = new EnrichmentService();
