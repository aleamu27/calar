/**
 * Mock Embedding Provider
 * Generates deterministic mock embeddings for development/testing.
 */

import type {
  IEmbeddingProvider,
  EmbeddingInput,
  EmbeddingResult,
} from '../../core/interfaces/embedding';

const MOCK_DIMENSIONS = 1536; // Match OpenAI ada-002

export class MockEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'mock';
  readonly modelName = 'mock-embedding-v1';
  readonly dimensions = MOCK_DIMENSIONS;

  isConfigured(): boolean {
    return true;
  }

  async embed(input: EmbeddingInput): Promise<EmbeddingResult> {
    // Simulate API delay
    await this.simulateDelay();

    const embedding = this.generateDeterministicEmbedding(input.text);

    return {
      embedding,
      model: this.modelName,
      dimensions: this.dimensions,
      usage: {
        promptTokens: this.estimateTokens(input.text),
        totalTokens: this.estimateTokens(input.text),
      },
    };
  }

  async embedBatch(inputs: EmbeddingInput[]): Promise<EmbeddingResult[]> {
    await this.simulateDelay();

    return inputs.map((input) => ({
      embedding: this.generateDeterministicEmbedding(input.text),
      model: this.modelName,
      dimensions: this.dimensions,
      usage: {
        promptTokens: this.estimateTokens(input.text),
        totalTokens: this.estimateTokens(input.text),
      },
    }));
  }

  /**
   * Generates a deterministic embedding based on text hash.
   * Same text always produces the same embedding.
   */
  private generateDeterministicEmbedding(text: string): number[] {
    const embedding: number[] = new Array(this.dimensions);

    // Use simple hash-based seeding
    let seed = this.hashCode(text);

    for (let i = 0; i < this.dimensions; i++) {
      // Seeded pseudo-random number generator (xorshift)
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;

      // Normalize to [-1, 1] range typical for embeddings
      embedding[i] = ((seed % 2000000) / 1000000) - 1;
    }

    // Normalize vector to unit length
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );

    return embedding.map((val) => val / magnitude);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private simulateDelay(): Promise<void> {
    const delay = Math.random() * 50 + 25; // 25-75ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
