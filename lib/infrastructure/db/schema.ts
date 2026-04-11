/**
 * Drizzle ORM Schema - Enterprise Multi-Tenant Edition
 *
 * Tables:
 * - tenants: Client organizations
 * - api_keys: Authentication keys per tenant
 * - visitors: Unique users (tenant-scoped)
 * - attributions: Marketing attribution data
 * - leads: Converted visitors with scoring
 * - page_views: Visitor page view tracking
 * - signals: Triggered automation events
 * - integrations: External service connections
 * - integration_logs: Webhook/sync attempt logs
 * - embeddings: Vector embeddings for semantic search
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  integer,
  boolean,
  pgEnum,
  vector,
  real,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import type { TenantSettings } from '../../core/interfaces/tenant';

// ============================================================================
// ENUMS
// ============================================================================

export const signalTypeEnum = pgEnum('signal_type', [
  'score_threshold',
  'high_intent',
  'returning_visitor',
  'custom',
]);

export const signalStatusEnum = pgEnum('signal_status', [
  'pending',
  'processing',
  'delivered',
  'failed',
]);

export const integrationTypeEnum = pgEnum('integration_type', [
  'hubspot',
  'salesforce',
  'slack',
  'webhook',
  'zapier',
]);

export const integrationStatusEnum = pgEnum('integration_status', [
  'active',
  'paused',
  'error',
  'disconnected',
]);

export const apiKeyStatusEnum = pgEnum('api_key_status', [
  'active',
  'revoked',
  'expired',
]);

export const embeddingTypeEnum = pgEnum('embedding_type', [
  'lead_behavior',
  'lead_profile',
  'page_content',
  'campaign',
]);

// ============================================================================
// TENANTS TABLE (Multi-tenancy root)
// ============================================================================

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    domain: varchar('domain', { length: 255 }),
    settings: jsonb('settings').$type<TenantSettings>(),
    plan: varchar('plan', { length: 50 }).notNull().default('free'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('tenants_slug_idx').on(table.slug),
    index('tenants_domain_idx').on(table.domain),
  ]
);

// ============================================================================
// API KEYS TABLE
// ============================================================================

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    keyHash: varchar('key_hash', { length: 64 }).notNull(), // SHA-256 hash
    keyPrefix: varchar('key_prefix', { length: 12 }).notNull(), // First 8 chars for display
    status: apiKeyStatusEnum('status').notNull().default('active'),
    scopes: jsonb('scopes').$type<string[]>().default([]),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
    index('api_keys_tenant_id_idx').on(table.tenantId),
    index('api_keys_key_prefix_idx').on(table.keyPrefix),
    index('api_keys_status_idx').on(table.status),
  ]
);

// ============================================================================
// VISITORS TABLE (tenant-scoped)
// ============================================================================

export const visitors = pgTable(
  'visitors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    visitorUuid: uuid('visitor_uuid').notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('visitors_tenant_uuid_idx').on(table.tenantId, table.visitorUuid),
    index('visitors_tenant_id_idx').on(table.tenantId),
    index('visitors_first_seen_at_idx').on(table.firstSeenAt),
  ]
);

// ============================================================================
// ATTRIBUTIONS TABLE (tenant-scoped)
// ============================================================================

export const attributions = pgTable(
  'attributions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    visitorId: uuid('visitor_id')
      .notNull()
      .references(() => visitors.id, { onDelete: 'cascade' }),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),
    referrer: text('referrer'),
    landingPage: text('landing_page'),
    capturedAt: timestamp('captured_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('attributions_tenant_id_idx').on(table.tenantId),
    index('attributions_visitor_id_idx').on(table.visitorId),
    index('attributions_utm_source_idx').on(table.tenantId, table.utmSource),
    index('attributions_utm_campaign_idx').on(table.tenantId, table.utmCampaign),
    index('attributions_captured_at_idx').on(table.capturedAt),
  ]
);

// ============================================================================
// PAGE VIEWS TABLE (tenant-scoped)
// ============================================================================

export const pageViews = pgTable(
  'page_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    visitorId: uuid('visitor_id')
      .notNull()
      .references(() => visitors.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    title: varchar('title', { length: 500 }),
    isHighValue: boolean('is_high_value').notNull().default(false),
    duration: integer('duration'),
    viewedAt: timestamp('viewed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('page_views_tenant_id_idx').on(table.tenantId),
    index('page_views_visitor_id_idx').on(table.visitorId),
    index('page_views_path_idx').on(table.tenantId, table.path),
    index('page_views_viewed_at_idx').on(table.viewedAt),
    index('page_views_is_high_value_idx').on(table.tenantId, table.isHighValue),
  ]
);

// ============================================================================
// LEADS TABLE (tenant-scoped with scoring)
// ============================================================================

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    visitorId: uuid('visitor_id')
      .notNull()
      .references(() => visitors.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    name: varchar('name', { length: 255 }),
    company: varchar('company', { length: 255 }),
    enrichedCompany: varchar('enriched_company', { length: 255 }),
    score: integer('score').notNull().default(0),
    scoreBreakdown: jsonb('score_breakdown').$type<ScoreBreakdown>(),
    enrichedAt: timestamp('enriched_at', { withTimezone: true }),
    ipAddress: varchar('ip_address', { length: 45 }),
    externalIds: jsonb('external_ids').$type<ExternalIds>(), // HubSpot ID, Salesforce ID, etc.
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    convertedAt: timestamp('converted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('leads_tenant_email_idx').on(table.tenantId, table.email),
    index('leads_tenant_id_idx').on(table.tenantId),
    index('leads_visitor_id_idx').on(table.visitorId),
    index('leads_converted_at_idx').on(table.tenantId, table.convertedAt),
    index('leads_score_idx').on(table.tenantId, table.score),
  ]
);

// ============================================================================
// SIGNALS TABLE (tenant-scoped)
// ============================================================================

export const signals = pgTable(
  'signals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    type: signalTypeEnum('type').notNull(),
    status: signalStatusEnum('status').notNull().default('pending'),
    payload: jsonb('payload').$type<SignalPayload>(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('signals_tenant_id_idx').on(table.tenantId),
    index('signals_lead_id_idx').on(table.leadId),
    index('signals_type_idx').on(table.tenantId, table.type),
    index('signals_status_idx').on(table.tenantId, table.status),
    index('signals_created_at_idx').on(table.createdAt),
  ]
);

// ============================================================================
// INTEGRATIONS TABLE (tenant's connected services)
// ============================================================================

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: integrationTypeEnum('type').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: integrationStatusEnum('status').notNull().default('active'),
    config: jsonb('config').$type<IntegrationConfig>(),
    credentials: jsonb('credentials').$type<EncryptedCredentials>(), // Encrypted at rest
    triggerConditions: jsonb('trigger_conditions').$type<TriggerConditions>(),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('integrations_tenant_id_idx').on(table.tenantId),
    index('integrations_type_idx').on(table.tenantId, table.type),
    index('integrations_status_idx').on(table.tenantId, table.status),
  ]
);

// ============================================================================
// INTEGRATION LOGS TABLE (webhook/sync attempt logging)
// ============================================================================

export const integrationLogs = pgTable(
  'integration_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    integrationId: uuid('integration_id')
      .notNull()
      .references(() => integrations.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(), // e.g., 'create_contact', 'update_deal'
    status: varchar('status', { length: 20 }).notNull(), // 'success', 'failed', 'retrying'
    requestPayload: jsonb('request_payload'),
    responsePayload: jsonb('response_payload'),
    responseStatus: integer('response_status'),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('integration_logs_tenant_id_idx').on(table.tenantId),
    index('integration_logs_integration_id_idx').on(table.integrationId),
    index('integration_logs_lead_id_idx').on(table.leadId),
    index('integration_logs_status_idx').on(table.status),
    index('integration_logs_created_at_idx').on(table.createdAt),
  ]
);

// ============================================================================
// EMBEDDINGS TABLE (Vector support for semantic search)
// Note: Requires pgvector extension: CREATE EXTENSION IF NOT EXISTS vector;
// ============================================================================

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: embeddingTypeEnum('type').notNull(),
    sourceId: uuid('source_id').notNull(), // Lead ID, Page ID, etc.
    sourceText: text('source_text').notNull(), // Original text that was embedded
    embedding: vector('embedding', { dimensions: 1536 }), // OpenAI ada-002 dimension
    model: varchar('model', { length: 100 }).notNull().default('text-embedding-ada-002'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('embeddings_tenant_id_idx').on(table.tenantId),
    index('embeddings_type_idx').on(table.tenantId, table.type),
    index('embeddings_source_id_idx').on(table.sourceId),
    // HNSW index for fast similarity search (add via migration)
    // index('embeddings_vector_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  apiKeys: many(apiKeys),
  visitors: many(visitors),
  leads: many(leads),
  integrations: many(integrations),
  embeddings: many(embeddings),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [apiKeys.tenantId],
    references: [tenants.id],
  }),
}));

export const visitorsRelations = relations(visitors, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [visitors.tenantId],
    references: [tenants.id],
  }),
  attributions: many(attributions),
  leads: many(leads),
  pageViews: many(pageViews),
}));

export const attributionsRelations = relations(attributions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [attributions.tenantId],
    references: [tenants.id],
  }),
  visitor: one(visitors, {
    fields: [attributions.visitorId],
    references: [visitors.id],
  }),
}));

export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  tenant: one(tenants, {
    fields: [pageViews.tenantId],
    references: [tenants.id],
  }),
  visitor: one(visitors, {
    fields: [pageViews.visitorId],
    references: [visitors.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
  visitor: one(visitors, {
    fields: [leads.visitorId],
    references: [visitors.id],
  }),
  signals: many(signals),
  integrationLogs: many(integrationLogs),
}));

export const signalsRelations = relations(signals, ({ one }) => ({
  tenant: one(tenants, {
    fields: [signals.tenantId],
    references: [tenants.id],
  }),
  lead: one(leads, {
    fields: [signals.leadId],
    references: [leads.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [integrations.tenantId],
    references: [tenants.id],
  }),
  logs: many(integrationLogs),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [integrationLogs.tenantId],
    references: [tenants.id],
  }),
  integration: one(integrations, {
    fields: [integrationLogs.integrationId],
    references: [integrations.id],
  }),
  lead: one(leads, {
    fields: [integrationLogs.leadId],
    references: [leads.id],
  }),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [embeddings.tenantId],
    references: [tenants.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Re-export TenantSettings from core
export type { TenantSettings } from '../../core/interfaces/tenant';

export interface ExternalIds {
  hubspotId?: string;
  salesforceId?: string;
  intercomId?: string;
  [key: string]: string | undefined;
}

export interface IntegrationConfig {
  endpoint?: string;
  fieldMappings?: Record<string, string>;
  syncDirection?: 'push' | 'pull' | 'bidirectional';
  batchSize?: number;
}

export interface EncryptedCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  encryptedAt?: string;
}

export interface TriggerConditions {
  scoreThreshold?: number;
  events?: string[];
  filters?: Record<string, unknown>;
}

export interface ScoreBreakdown {
  pageViews: number;
  highValuePages: number;
  repeatedVisits: number;
  businessEmail: number;
  enrichment: number;
  total: number;
  calculatedAt: string;
}

export interface SignalPayload {
  leadEmail: string;
  leadName?: string;
  score: number;
  triggerReason: string;
  notificationSent?: boolean;
  notificationId?: string;
}

// Record types
export type TenantRecord = typeof tenants.$inferSelect;
export type NewTenantRecord = typeof tenants.$inferInsert;

export type ApiKeyRecord = typeof apiKeys.$inferSelect;
export type NewApiKeyRecord = typeof apiKeys.$inferInsert;

export type VisitorRecord = typeof visitors.$inferSelect;
export type NewVisitorRecord = typeof visitors.$inferInsert;

export type AttributionRecord = typeof attributions.$inferSelect;
export type NewAttributionRecord = typeof attributions.$inferInsert;

export type PageViewRecord = typeof pageViews.$inferSelect;
export type NewPageViewRecord = typeof pageViews.$inferInsert;

export type LeadRecord = typeof leads.$inferSelect;
export type NewLeadRecord = typeof leads.$inferInsert;

export type SignalRecord = typeof signals.$inferSelect;
export type NewSignalRecord = typeof signals.$inferInsert;

export type IntegrationRecord = typeof integrations.$inferSelect;
export type NewIntegrationRecord = typeof integrations.$inferInsert;

export type IntegrationLogRecord = typeof integrationLogs.$inferSelect;
export type NewIntegrationLogRecord = typeof integrationLogs.$inferInsert;

export type EmbeddingRecord = typeof embeddings.$inferSelect;
export type NewEmbeddingRecord = typeof embeddings.$inferInsert;

// Enum types
export type SignalType = 'score_threshold' | 'high_intent' | 'returning_visitor' | 'custom';
export type SignalStatus = 'pending' | 'processing' | 'delivered' | 'failed';
export type IntegrationType = 'hubspot' | 'salesforce' | 'slack' | 'webhook' | 'zapier';
export type IntegrationStatus = 'active' | 'paused' | 'error' | 'disconnected';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';
export type EmbeddingType = 'lead_behavior' | 'lead_profile' | 'page_content' | 'campaign';
