/**
 * Tenant Context
 * Request-scoped context for multi-tenant data isolation.
 * Uses AsyncLocalStorage for automatic propagation across async boundaries.
 */

import { AsyncLocalStorage } from 'async_hooks';
import type { ITenantContext, Tenant } from '../interfaces/tenant';

interface TenantStore {
  tenant: Tenant;
}

/**
 * AsyncLocalStorage for tenant context propagation.
 */
const tenantStorage = new AsyncLocalStorage<TenantStore>();

/**
 * Error thrown when tenant context is required but not available.
 */
export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

/**
 * TenantContext implementation using AsyncLocalStorage.
 * Provides request-scoped tenant isolation.
 */
export class TenantContext implements ITenantContext {
  /**
   * Gets current tenant ID. Throws if not in tenant context.
   */
  get tenantId(): string {
    const store = tenantStorage.getStore();
    if (!store) {
      throw new TenantContextError(
        'No tenant context available. Ensure request is wrapped with runWithTenant().'
      );
    }
    return store.tenant.id;
  }

  /**
   * Gets current tenant. Throws if not in tenant context.
   */
  get tenant(): Tenant {
    const store = tenantStorage.getStore();
    if (!store) {
      throw new TenantContextError(
        'No tenant context available. Ensure request is wrapped with runWithTenant().'
      );
    }
    return store.tenant;
  }

  /**
   * Checks if tenant context is available.
   */
  isResolved(): boolean {
    return tenantStorage.getStore() !== undefined;
  }

  /**
   * Gets tenant ID or null if not resolved.
   */
  getTenantIdOrNull(): string | null {
    const store = tenantStorage.getStore();
    return store?.tenant.id ?? null;
  }
}

/**
 * Runs a function within a tenant context.
 * All async operations within will have access to the tenant.
 */
export function runWithTenant<T>(tenant: Tenant, fn: () => T): T {
  return tenantStorage.run({ tenant }, fn);
}

/**
 * Gets the current tenant context.
 * Returns null if not in a tenant context.
 */
export function getCurrentTenant(): Tenant | null {
  return tenantStorage.getStore()?.tenant ?? null;
}

/**
 * Gets the current tenant ID.
 * Returns null if not in a tenant context.
 */
export function getCurrentTenantId(): string | null {
  return tenantStorage.getStore()?.tenant.id ?? null;
}

/**
 * Requires tenant context. Throws if not available.
 */
export function requireTenantContext(): Tenant {
  const tenant = getCurrentTenant();
  if (!tenant) {
    throw new TenantContextError(
      'Tenant context required but not available.'
    );
  }
  return tenant;
}

/**
 * Singleton tenant context instance.
 */
export const tenantContext = new TenantContext();
