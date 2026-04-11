/**
 * Lead Capture DTOs
 * Data Transfer Objects for the lead capture workflow.
 * Defines the contract between API layer and application services.
 */

import type { Lead, Attribution } from '../../core/entities';

/**
 * Input for capturing a new lead.
 * visitorUuid comes from the client-side tracking cookie.
 */
export interface CaptureLeadInput {
  visitorUuid: string;
  email: string;
  name?: string;
  company?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  attribution?: AttributionInput;
}

/**
 * Attribution data parsed from the hepta_attribution cookie.
 */
export interface AttributionInput {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPage?: string;
}

/**
 * Result of a successful lead capture.
 */
export interface CaptureLeadResult {
  lead: Lead;
  attribution: Attribution | null;
  isNewVisitor: boolean;
}

/**
 * Validation result for lead capture input.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
