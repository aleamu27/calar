/**
 * API Key Service
 * Manages API key creation, validation, and revocation.
 */

import { createHash, randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../../infrastructure/db/client';
import { apiKeys, tenants } from '../../infrastructure/db/schema';
import type { Tenant } from '../../core/interfaces/tenant';

const API_KEY_PREFIX = 'hpt';
const KEY_LENGTH = 32;

export interface CreateApiKeyInput {
  tenantId: string;
  name: string;
  scopes?: string[];
  expiresInDays?: number;
}

export interface CreateApiKeyResult {
  id: string;
  key: string; // Only returned once at creation
  keyPrefix: string;
  name: string;
  scopes: string[];
  expiresAt: Date | null;
}

export interface ValidateApiKeyResult {
  valid: boolean;
  tenant: Tenant | null;
  keyId: string | null;
  scopes: string[];
  error?: string;
}

export class ApiKeyService {
  /**
   * Creates a new API key for a tenant.
   * The full key is only returned once and should be shown to the user immediately.
   */
  async createKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    // Generate secure random key
    const rawKey = randomBytes(KEY_LENGTH).toString('hex');
    const fullKey = `${API_KEY_PREFIX}_${rawKey}`;

    // Hash for storage (never store plain key)
    const keyHash = this.hashKey(fullKey);
    const keyPrefix = fullKey.slice(0, 12);

    // Calculate expiration
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [created] = await db
      .insert(apiKeys)
      .values({
        tenantId: input.tenantId,
        name: input.name,
        keyHash,
        keyPrefix,
        scopes: input.scopes ?? [],
        expiresAt,
        status: 'active',
      })
      .returning();

    return {
      id: created.id,
      key: fullKey, // Only time the full key is available
      keyPrefix,
      name: created.name,
      scopes: (created.scopes as string[]) ?? [],
      expiresAt,
    };
  }

  /**
   * Validates an API key and returns the associated tenant.
   */
  async validateKey(apiKey: string): Promise<ValidateApiKeyResult> {
    // Basic format validation
    if (!apiKey || !apiKey.startsWith(`${API_KEY_PREFIX}_`)) {
      return {
        valid: false,
        tenant: null,
        keyId: null,
        scopes: [],
        error: 'Invalid API key format',
      };
    }

    const keyHash = this.hashKey(apiKey);

    // Find key by hash
    const [keyRecord] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!keyRecord) {
      return {
        valid: false,
        tenant: null,
        keyId: null,
        scopes: [],
        error: 'API key not found',
      };
    }

    // Check status
    if (keyRecord.status !== 'active') {
      return {
        valid: false,
        tenant: null,
        keyId: keyRecord.id,
        scopes: [],
        error: `API key is ${keyRecord.status}`,
      };
    }

    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      // Mark as expired
      await db
        .update(apiKeys)
        .set({ status: 'expired' })
        .where(eq(apiKeys.id, keyRecord.id));

      return {
        valid: false,
        tenant: null,
        keyId: keyRecord.id,
        scopes: [],
        error: 'API key has expired',
      };
    }

    // Fetch tenant
    const [tenantRecord] = await db
      .select()
      .from(tenants)
      .where(
        and(
          eq(tenants.id, keyRecord.tenantId),
          eq(tenants.isActive, true)
        )
      )
      .limit(1);

    if (!tenantRecord) {
      return {
        valid: false,
        tenant: null,
        keyId: keyRecord.id,
        scopes: [],
        error: 'Tenant not found or inactive',
      };
    }

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyRecord.id));

    const tenant: Tenant = {
      id: tenantRecord.id,
      name: tenantRecord.name,
      slug: tenantRecord.slug,
      domain: tenantRecord.domain,
      plan: tenantRecord.plan,
      isActive: tenantRecord.isActive,
      settings: tenantRecord.settings,
    };

    return {
      valid: true,
      tenant,
      keyId: keyRecord.id,
      scopes: (keyRecord.scopes as string[]) ?? [],
    };
  }

  /**
   * Revokes an API key.
   */
  async revokeKey(keyId: string, tenantId: string): Promise<boolean> {
    const result = await db
      .update(apiKeys)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.tenantId, tenantId)
        )
      )
      .returning({ id: apiKeys.id });

    return result.length > 0;
  }

  /**
   * Lists all API keys for a tenant (without the actual key values).
   */
  async listKeys(tenantId: string) {
    return db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        status: apiKeys.status,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, tenantId))
      .orderBy(apiKeys.createdAt);
  }

  /**
   * Hashes an API key using SHA-256.
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}

export const apiKeyService = new ApiKeyService();
