/**
 * Tenant Interfaces
 * Multi-tenancy contracts for data isolation.
 */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: string;
  isActive: boolean;
  settings: TenantSettings | null;
}

export interface TenantSettings {
  timezone?: string;
  scoreThreshold?: number;
  highValuePages?: string[];
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
  features?: {
    enrichment?: boolean;
    integrations?: boolean;
    semanticSearch?: boolean;
  };
}

/**
 * Tenant context for request-scoped tenant resolution.
 * Provides the current tenant for all database operations.
 */
export interface ITenantContext {
  /**
   * Current tenant ID. Throws if not resolved.
   */
  readonly tenantId: string;

  /**
   * Current tenant data. Throws if not resolved.
   */
  readonly tenant: Tenant;

  /**
   * Check if tenant context is available.
   */
  isResolved(): boolean;

  /**
   * Get tenant ID or null if not resolved.
   */
  getTenantIdOrNull(): string | null;
}

/**
 * Tenant resolver strategies.
 */
export interface ITenantResolver {
  /**
   * Resolves tenant from API key.
   */
  resolveFromApiKey(apiKey: string): Promise<Tenant | null>;

  /**
   * Resolves tenant from session/JWT.
   */
  resolveFromSession(sessionToken: string): Promise<Tenant | null>;

  /**
   * Resolves tenant from domain.
   */
  resolveFromDomain(domain: string): Promise<Tenant | null>;
}
