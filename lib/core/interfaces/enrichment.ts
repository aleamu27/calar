/**
 * Enrichment Interfaces
 * Strategy pattern contracts for company data enrichment.
 * Enables swapping between providers (Clearbit, AbstractAPI, MaxMind, etc.)
 */

/**
 * Result of a company enrichment lookup.
 */
export interface EnrichmentResult {
  success: boolean;
  companyName: string | null;
  domain: string | null;
  industry: string | null;
  employeeCount: string | null;
  location: string | null;
  confidence: number; // 0-100
  provider: string;
  raw?: Record<string, unknown>;
}

/**
 * Input for enrichment lookup.
 */
export interface EnrichmentInput {
  ipAddress?: string;
  email?: string;
  domain?: string;
}

/**
 * Strategy interface for company enrichment providers.
 * Implementations handle provider-specific API calls.
 */
export interface ICompanyEnricher {
  readonly providerName: string;

  /**
   * Attempts to enrich company data from the given input.
   * Should never throw - returns success: false on errors.
   */
  enrich(input: EnrichmentInput): Promise<EnrichmentResult>;

  /**
   * Checks if this enricher can handle the given input.
   */
  canHandle(input: EnrichmentInput): boolean;
}

/**
 * Configuration for enrichment service.
 */
export interface EnrichmentConfig {
  enabled: boolean;
  providers: EnricherProviderConfig[];
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
}

export interface EnricherProviderConfig {
  name: string;
  priority: number;
  apiKey?: string;
  endpoint?: string;
  enabled: boolean;
}
