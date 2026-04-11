/**
 * Score Service
 * Pure, deterministic lead scoring engine.
 * All scoring logic is stateless and easily unit-testable.
 */

import type {
  ScoringInput,
  ScoringResult,
  ScoringRuleResult,
  ScoringWeights,
} from '../../core/interfaces/scoring';
import { DEFAULT_SCORING_WEIGHTS } from '../../core/interfaces/scoring';

/**
 * Consumer email domains that don't contribute to business email score.
 */
const CONSUMER_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.de',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'gmx.de',
  'web.de',
  'qq.com',
  '163.com',
  '126.com',
]);

export class ScoreService {
  private readonly weights: ScoringWeights;

  constructor(weights: Partial<ScoringWeights> = {}) {
    this.weights = { ...DEFAULT_SCORING_WEIGHTS, ...weights };
  }

  /**
   * Calculates the total score for a lead based on available signals.
   * This function is pure and deterministic.
   */
  calculate(input: ScoringInput): ScoringResult {
    const rules: ScoringRuleResult[] = [];
    const breakdown = {
      pageViews: 0,
      highValuePages: 0,
      repeatedVisits: 0,
      businessEmail: 0,
      enrichment: 0,
    };

    // Rule 1: Page view points
    const pageViewScore = this.calculatePageViewScore(input.pageViewCount);
    if (pageViewScore.points > 0) {
      rules.push(pageViewScore);
      breakdown.pageViews = pageViewScore.points;
    }

    // Rule 2: High-value page bonus
    const highValueScore = this.calculateHighValuePageScore(input.highValuePageCount);
    if (highValueScore.points > 0) {
      rules.push(highValueScore);
      breakdown.highValuePages = highValueScore.points;
    }

    // Rule 3: Repeated visits bonus
    const repeatedVisitScore = this.calculateRepeatedVisitScore(input.uniqueVisitDays);
    if (repeatedVisitScore.points > 0) {
      rules.push(repeatedVisitScore);
      breakdown.repeatedVisits = repeatedVisitScore.points;
    }

    // Rule 4: Business email domain
    const businessEmailScore = this.calculateBusinessEmailScore(input.email);
    if (businessEmailScore.points > 0) {
      rules.push(businessEmailScore);
      breakdown.businessEmail = businessEmailScore.points;
    }

    // Rule 5: Enriched company data
    const enrichmentScore = this.calculateEnrichmentScore(input.hasEnrichedCompany);
    if (enrichmentScore.points > 0) {
      rules.push(enrichmentScore);
      breakdown.enrichment = enrichmentScore.points;
    }

    // Rule 6: Custom factors (extensibility point)
    if (input.customFactors) {
      for (const [factor, points] of Object.entries(input.customFactors)) {
        if (points !== 0) {
          rules.push({
            ruleName: `custom_${factor}`,
            points,
            reason: `Custom factor: ${factor}`,
            metadata: { factor },
          });
        }
      }
    }

    const totalScore = rules.reduce((sum, rule) => sum + rule.points, 0);

    return {
      totalScore,
      rules,
      breakdown,
      calculatedAt: new Date(),
    };
  }

  /**
   * Checks if a score exceeds the given threshold.
   */
  exceedsThreshold(score: number, threshold: number): boolean {
    return score > threshold;
  }

  /**
   * Returns the weights configuration (useful for debugging/display).
   */
  getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  // =========================================================================
  // SCORING RULES (all pure functions)
  // =========================================================================

  private calculatePageViewScore(pageViewCount: number): ScoringRuleResult {
    const points = pageViewCount * this.weights.pageView;
    return {
      ruleName: 'page_views',
      points,
      reason: `${pageViewCount} page views @ ${this.weights.pageView} points each`,
      metadata: { pageViewCount },
    };
  }

  private calculateHighValuePageScore(highValuePageCount: number): ScoringRuleResult {
    const points = highValuePageCount * this.weights.highValuePage;
    return {
      ruleName: 'high_value_pages',
      points,
      reason: `${highValuePageCount} high-value page views @ ${this.weights.highValuePage} points each`,
      metadata: { highValuePageCount },
    };
  }

  private calculateRepeatedVisitScore(uniqueVisitDays: number): ScoringRuleResult {
    if (uniqueVisitDays < this.weights.repeatedVisitThreshold) {
      return {
        ruleName: 'repeated_visits',
        points: 0,
        reason: `${uniqueVisitDays} visit days (threshold: ${this.weights.repeatedVisitThreshold})`,
        metadata: { uniqueVisitDays },
      };
    }

    return {
      ruleName: 'repeated_visits',
      points: this.weights.repeatedVisits,
      reason: `${uniqueVisitDays}+ visit days (returning visitor)`,
      metadata: { uniqueVisitDays },
    };
  }

  private calculateBusinessEmailScore(email: string): ScoringRuleResult {
    const domain = this.extractDomain(email);
    const isBusinessEmail = domain && !CONSUMER_EMAIL_DOMAINS.has(domain.toLowerCase());

    return {
      ruleName: 'business_email',
      points: isBusinessEmail ? this.weights.businessEmail : 0,
      reason: isBusinessEmail
        ? `Business email domain: ${domain}`
        : `Consumer email domain: ${domain ?? 'unknown'}`,
      metadata: { domain, isBusinessEmail },
    };
  }

  private calculateEnrichmentScore(hasEnrichedCompany: boolean): ScoringRuleResult {
    return {
      ruleName: 'enriched_company',
      points: hasEnrichedCompany ? this.weights.enrichedCompany : 0,
      reason: hasEnrichedCompany
        ? 'Company data enriched'
        : 'No enrichment data',
      metadata: { hasEnrichedCompany },
    };
  }

  private extractDomain(email: string): string | null {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : null;
  }
}

/**
 * Default service instance for convenience.
 */
export const scoreService = new ScoreService();
