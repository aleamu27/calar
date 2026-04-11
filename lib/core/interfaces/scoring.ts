/**
 * Scoring Interfaces
 * Contracts for the lead scoring engine.
 */

/**
 * Individual scoring rule result.
 */
export interface ScoringRuleResult {
  ruleName: string;
  points: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

/**
 * Complete scoring calculation result.
 */
export interface ScoringResult {
  totalScore: number;
  rules: ScoringRuleResult[];
  breakdown: {
    pageViews: number;
    highValuePages: number;
    repeatedVisits: number;
    businessEmail: number;
    enrichment: number;
  };
  calculatedAt: Date;
}

/**
 * Input data for score calculation.
 * All fields are optional - score is calculated based on available data.
 */
export interface ScoringInput {
  email: string;
  pageViewCount: number;
  highValuePageCount: number;
  uniqueVisitDays: number;
  hasEnrichedCompany: boolean;
  customFactors?: Record<string, number>;
}

/**
 * Configurable scoring weights.
 * Allows tuning the scoring algorithm without code changes.
 */
export interface ScoringWeights {
  pageView: number;
  highValuePage: number;
  repeatedVisits: number;
  repeatedVisitThreshold: number;
  businessEmail: number;
  enrichedCompany: number;
}

/**
 * Default scoring weights.
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  pageView: 1,
  highValuePage: 15,
  repeatedVisits: 20,
  repeatedVisitThreshold: 3,
  businessEmail: 25,
  enrichedCompany: 10,
};
