/**
 * Clearbit Company Enricher
 * Production enricher using Clearbit's Company API.
 * Requires CLEARBIT_API_KEY environment variable.
 */

import type {
  ICompanyEnricher,
  EnrichmentInput,
  EnrichmentResult,
} from '../../core/interfaces/enrichment';

interface ClearbitCompanyResponse {
  name: string;
  domain: string;
  category?: {
    industry?: string;
    sector?: string;
  };
  metrics?: {
    employees?: number;
    employeesRange?: string;
  };
  location?: string;
  geo?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

export class ClearbitCompanyEnricher implements ICompanyEnricher {
  readonly providerName = 'clearbit';
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://company.clearbit.com/v2/companies';

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.CLEARBIT_API_KEY;
  }

  canHandle(input: EnrichmentInput): boolean {
    return Boolean(this.apiKey && (input.email || input.domain));
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    if (!this.apiKey) {
      return this.errorResult('Clearbit API key not configured');
    }

    const domain = this.extractDomain(input);
    if (!domain) {
      return this.errorResult('No domain available for lookup');
    }

    try {
      const response = await fetch(`${this.baseUrl}/find?domain=${encodeURIComponent(domain)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 404) {
        return this.notFoundResult(domain);
      }

      if (!response.ok) {
        return this.errorResult(`Clearbit API error: ${response.status}`);
      }

      const data: ClearbitCompanyResponse = await response.json();

      return {
        success: true,
        companyName: data.name ?? null,
        domain: data.domain ?? domain,
        industry: data.category?.industry ?? null,
        employeeCount: data.metrics?.employeesRange ?? null,
        location: this.formatLocation(data),
        confidence: 90,
        provider: this.providerName,
        raw: data as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.errorResult(`Clearbit request failed: ${message}`);
    }
  }

  private extractDomain(input: EnrichmentInput): string | null {
    if (input.domain) {
      return input.domain;
    }

    if (input.email) {
      const parts = input.email.split('@');
      if (parts.length === 2) {
        return parts[1];
      }
    }

    return null;
  }

  private formatLocation(data: ClearbitCompanyResponse): string | null {
    if (data.location) {
      return data.location;
    }

    if (data.geo) {
      const parts = [data.geo.city, data.geo.state, data.geo.country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : null;
    }

    return null;
  }

  private notFoundResult(domain: string): EnrichmentResult {
    return {
      success: false,
      companyName: null,
      domain,
      industry: null,
      employeeCount: null,
      location: null,
      confidence: 0,
      provider: this.providerName,
      raw: { reason: 'Company not found in Clearbit database' },
    };
  }

  private errorResult(reason: string): EnrichmentResult {
    return {
      success: false,
      companyName: null,
      domain: null,
      industry: null,
      employeeCount: null,
      location: null,
      confidence: 0,
      provider: this.providerName,
      raw: { error: reason },
    };
  }
}
