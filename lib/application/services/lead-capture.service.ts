/**
 * Lead Capture Service
 * Orchestrates the lead capture workflow:
 * 1. Find or create visitor
 * 2. Parse and store attribution data
 * 3. Create lead record
 *
 * All operations execute within a single database transaction.
 */

import type { IUnitOfWork } from '../../core/interfaces';
import type { RawAttributionData } from '../../core/entities';
import type {
  CaptureLeadInput,
  CaptureLeadResult,
  AttributionInput,
  ValidationResult,
  ValidationError,
} from '../dto/lead-capture.dto';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LeadCaptureService {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  /**
   * Validates lead capture input.
   */
  validate(input: CaptureLeadInput): ValidationResult {
    const errors: ValidationError[] = [];

    if (!input.visitorUuid || !UUID_REGEX.test(input.visitorUuid)) {
      errors.push({
        field: 'visitorUuid',
        message: 'Valid UUID required',
      });
    }

    if (!input.email || !EMAIL_REGEX.test(input.email)) {
      errors.push({
        field: 'email',
        message: 'Valid email address required',
      });
    }

    if (input.name && input.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Name must be 255 characters or less',
      });
    }

    if (input.company && input.company.length > 255) {
      errors.push({
        field: 'company',
        message: 'Company must be 255 characters or less',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Captures a lead with full attribution tracking.
   * Executes all database operations in a single transaction.
   */
  async capture(input: CaptureLeadInput): Promise<CaptureLeadResult> {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new LeadCaptureValidationError(validation.errors);
    }

    return this.unitOfWork.transaction(async (ctx) => {
      // Step 1: Find or create visitor
      let visitor = await ctx.visitor.findByUuid(input.visitorUuid);
      const isNewVisitor = !visitor;

      if (visitor) {
        visitor = await ctx.visitor.updateLastSeen(visitor.id);
      } else {
        visitor = await ctx.visitor.create({
          visitorUuid: input.visitorUuid,
        });
      }

      // Step 2: Store attribution if provided
      let attribution = null;
      if (input.attribution && this.hasAttributionData(input.attribution)) {
        attribution = await ctx.attribution.create({
          visitorId: visitor.id,
          utmSource: input.attribution.utmSource,
          utmMedium: input.attribution.utmMedium,
          utmCampaign: input.attribution.utmCampaign,
          utmTerm: input.attribution.utmTerm,
          utmContent: input.attribution.utmContent,
          referrer: input.attribution.referrer,
          landingPage: input.attribution.landingPage,
        });
      }

      // Step 3: Create lead
      const lead = await ctx.lead.create({
        visitorId: visitor.id,
        email: input.email,
        name: input.name,
        company: input.company,
        ipAddress: input.ipAddress,
        metadata: input.metadata,
      });

      return {
        lead,
        attribution,
        isNewVisitor,
      };
    });
  }

  /**
   * Parses the hepta_attribution cookie value into structured data.
   */
  parseAttributionCookie(cookieValue: string): AttributionInput | null {
    try {
      const decoded = decodeURIComponent(cookieValue);
      const raw = JSON.parse(decoded) as RawAttributionData;

      return {
        utmSource: this.sanitizeString(raw.utm_source),
        utmMedium: this.sanitizeString(raw.utm_medium),
        utmCampaign: this.sanitizeString(raw.utm_campaign),
        utmTerm: this.sanitizeString(raw.utm_term),
        utmContent: this.sanitizeString(raw.utm_content),
        referrer: this.sanitizeString(raw.referrer),
        landingPage: this.sanitizeString(raw.landing_page),
      };
    } catch {
      return null;
    }
  }

  private hasAttributionData(attribution: AttributionInput): boolean {
    return Boolean(
      attribution.utmSource ||
        attribution.utmMedium ||
        attribution.utmCampaign ||
        attribution.utmTerm ||
        attribution.utmContent ||
        attribution.referrer ||
        attribution.landingPage
    );
  }

  private sanitizeString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim().slice(0, 2000);
    return trimmed || undefined;
  }
}

/**
 * Custom error for validation failures.
 * Enables typed error handling in API routes.
 */
export class LeadCaptureValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'LeadCaptureValidationError';
  }
}
