/**
 * Mock Company Enricher
 * Development/testing enricher that returns predictable results.
 * Use this when API providers are unavailable or for local development.
 */

import type {
  ICompanyEnricher,
  EnrichmentInput,
  EnrichmentResult,
} from '../../core/interfaces/enrichment';

/**
 * Mock data for known test domains.
 */
const MOCK_COMPANIES: Record<string, Partial<EnrichmentResult>> = {
  'microsoft.com': {
    companyName: 'Microsoft Corporation',
    industry: 'Technology',
    employeeCount: '10000+',
    location: 'Redmond, WA',
  },
  'google.com': {
    companyName: 'Google LLC',
    industry: 'Technology',
    employeeCount: '10000+',
    location: 'Mountain View, CA',
  },
  'salesforce.com': {
    companyName: 'Salesforce, Inc.',
    industry: 'Software',
    employeeCount: '10000+',
    location: 'San Francisco, CA',
  },
  'stripe.com': {
    companyName: 'Stripe, Inc.',
    industry: 'Financial Technology',
    employeeCount: '1000-5000',
    location: 'San Francisco, CA',
  },
  'shopify.com': {
    companyName: 'Shopify Inc.',
    industry: 'E-commerce',
    employeeCount: '5000-10000',
    location: 'Ottawa, Canada',
  },
};

export class MockCompanyEnricher implements ICompanyEnricher {
  readonly providerName = 'mock';

  canHandle(input: EnrichmentInput): boolean {
    return Boolean(input.email || input.domain);
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    // Simulate network delay
    await this.simulateDelay();

    const domain = this.extractDomain(input);

    if (!domain) {
      return this.noResult('No domain available');
    }

    // Check mock data
    const mockData = MOCK_COMPANIES[domain.toLowerCase()];

    if (mockData) {
      return {
        success: true,
        companyName: mockData.companyName ?? null,
        domain,
        industry: mockData.industry ?? null,
        employeeCount: mockData.employeeCount ?? null,
        location: mockData.location ?? null,
        confidence: 95,
        provider: this.providerName,
      };
    }

    // Generate plausible data for unknown business domains
    if (this.isBusinessDomain(domain)) {
      return {
        success: true,
        companyName: this.generateCompanyName(domain),
        domain,
        industry: null,
        employeeCount: null,
        location: null,
        confidence: 40,
        provider: this.providerName,
      };
    }

    return this.noResult('Consumer email domain');
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

  private isBusinessDomain(domain: string): boolean {
    const consumerDomains = [
      'gmail.com',
      'googlemail.com',
      'outlook.com',
      'hotmail.com',
      'live.com',
      'yahoo.com',
      'yahoo.co.uk',
      'icloud.com',
      'me.com',
      'aol.com',
      'protonmail.com',
      'proton.me',
      'mail.com',
      'zoho.com',
    ];

    return !consumerDomains.includes(domain.toLowerCase());
  }

  private generateCompanyName(domain: string): string {
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private noResult(reason: string): EnrichmentResult {
    return {
      success: false,
      companyName: null,
      domain: null,
      industry: null,
      employeeCount: null,
      location: null,
      confidence: 0,
      provider: this.providerName,
      raw: { reason },
    };
  }

  private simulateDelay(): Promise<void> {
    const delay = Math.random() * 100 + 50; // 50-150ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
