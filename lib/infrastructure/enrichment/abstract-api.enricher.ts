/**
 * AbstractAPI Company Enricher
 * IP-based company lookup using AbstractAPI's IP Geolocation service.
 * Requires ABSTRACTAPI_KEY environment variable.
 */

import type {
  ICompanyEnricher,
  EnrichmentInput,
  EnrichmentResult,
} from '../../core/interfaces/enrichment';

interface AbstractApiResponse {
  ip_address: string;
  company?: {
    name?: string;
    domain?: string;
    type?: string;
  };
  connection?: {
    organization_name?: string;
    isp_name?: string;
    connection_type?: string;
  };
  city?: string;
  region?: string;
  country?: string;
}

export class AbstractApiEnricher implements ICompanyEnricher {
  readonly providerName = 'abstractapi';
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://ipgeolocation.abstractapi.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ABSTRACTAPI_KEY;
  }

  canHandle(input: EnrichmentInput): boolean {
    return Boolean(this.apiKey && input.ipAddress);
  }

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    if (!this.apiKey) {
      return this.errorResult('AbstractAPI key not configured');
    }

    if (!input.ipAddress) {
      return this.errorResult('IP address required for AbstractAPI lookup');
    }

    // Skip private/local IPs
    if (this.isPrivateIp(input.ipAddress)) {
      return this.errorResult('Private IP address cannot be enriched');
    }

    try {
      const url = `${this.baseUrl}/?api_key=${this.apiKey}&ip_address=${encodeURIComponent(input.ipAddress)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return this.errorResult(`AbstractAPI error: ${response.status}`);
      }

      const data: AbstractApiResponse = await response.json();

      // Try to get company name from various fields
      const companyName =
        data.company?.name ?? data.connection?.organization_name ?? null;

      if (!companyName) {
        return this.notFoundResult(input.ipAddress);
      }

      return {
        success: true,
        companyName,
        domain: data.company?.domain ?? null,
        industry: null,
        employeeCount: null,
        location: this.formatLocation(data),
        confidence: this.calculateConfidence(data),
        provider: this.providerName,
        raw: data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.errorResult(`AbstractAPI request failed: ${message}`);
    }
  }

  private isPrivateIp(ip: string): boolean {
    // Check for common private IP ranges
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '127.0.0.1') {
      return true;
    }

    // 172.16.0.0 - 172.31.255.255
    if (ip.startsWith('172.')) {
      const secondOctet = parseInt(ip.split('.')[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }

    return false;
  }

  private formatLocation(data: AbstractApiResponse): string | null {
    const parts = [data.city, data.region, data.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  private calculateConfidence(data: AbstractApiResponse): number {
    // Company name directly available = high confidence
    if (data.company?.name) {
      return 85;
    }

    // ISP/organization name = lower confidence (might be ISP, not actual company)
    if (data.connection?.organization_name) {
      return 50;
    }

    return 0;
  }

  private notFoundResult(ip: string): EnrichmentResult {
    return {
      success: false,
      companyName: null,
      domain: null,
      industry: null,
      employeeCount: null,
      location: null,
      confidence: 0,
      provider: this.providerName,
      raw: { reason: 'No company data found for IP', ip },
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
