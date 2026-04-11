/**
 * Application Services
 */

export {
  LeadCaptureService,
  LeadCaptureValidationError,
} from './lead-capture.service';

export { ScoreService, scoreService } from './score.service';

export { EnrichmentService, enrichmentService } from './enrichment.service';

export { SignalService, signalService } from './signal.service';

export {
  LeadIntelligenceService,
  leadIntelligenceService,
  type IntelligenceResult,
  type ProcessLeadInput,
} from './lead-intelligence.service';

export {
  ApiKeyService,
  apiKeyService,
  type CreateApiKeyInput,
  type CreateApiKeyResult,
  type ValidateApiKeyResult,
} from './api-key.service';

export {
  IntegrationService,
  integrationService,
} from './integration.service';

export {
  EmbeddingService,
  embeddingService,
} from './embedding.service';
