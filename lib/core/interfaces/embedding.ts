/**
 * Embedding Interfaces
 * Contracts for vector embedding generation and search.
 */

/**
 * Vector embedding result.
 */
export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Input for embedding generation.
 */
export interface EmbeddingInput {
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Similarity search result.
 */
export interface SimilarityResult {
  id: string;
  sourceId: string;
  sourceText: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

/**
 * Strategy interface for embedding providers.
 */
export interface IEmbeddingProvider {
  readonly providerName: string;
  readonly modelName: string;
  readonly dimensions: number;

  /**
   * Generates embedding for given text.
   */
  embed(input: EmbeddingInput): Promise<EmbeddingResult>;

  /**
   * Generates embeddings for multiple texts (batch).
   */
  embedBatch(inputs: EmbeddingInput[]): Promise<EmbeddingResult[]>;

  /**
   * Checks if provider is properly configured.
   */
  isConfigured(): boolean;
}
