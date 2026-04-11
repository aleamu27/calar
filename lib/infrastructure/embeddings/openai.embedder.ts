/**
 * OpenAI Embedding Provider
 * Production embedding generation using OpenAI's text-embedding-ada-002.
 */

import type {
  IEmbeddingProvider,
  EmbeddingInput,
  EmbeddingResult,
} from '../../core/interfaces/embedding';

const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const DEFAULT_MODEL = 'text-embedding-ada-002';
const ADA_002_DIMENSIONS = 1536;

interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  readonly providerName = 'openai';
  readonly modelName: string;
  readonly dimensions = ADA_002_DIMENSIONS;

  private readonly apiKey: string | undefined;

  constructor(config?: { apiKey?: string; model?: string }) {
    this.apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY;
    this.modelName = config?.model ?? DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async embed(input: EmbeddingInput): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(OPENAI_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelName,
        input: input.text,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new OpenAIError(
        `OpenAI API error: ${response.status}`,
        response.status,
        error
      );
    }

    const data: OpenAIEmbeddingResponse = await response.json();

    return {
      embedding: data.data[0].embedding,
      model: data.model,
      dimensions: this.dimensions,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  async embedBatch(inputs: EmbeddingInput[]): Promise<EmbeddingResult[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (inputs.length === 0) {
      return [];
    }

    // OpenAI supports batch embedding
    const response = await fetch(OPENAI_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelName,
        input: inputs.map((i) => i.text),
      }),
      signal: AbortSignal.timeout(60000), // Longer timeout for batches
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new OpenAIError(
        `OpenAI API error: ${response.status}`,
        response.status,
        error
      );
    }

    const data: OpenAIEmbeddingResponse = await response.json();

    // Sort by index to maintain order
    const sorted = data.data.sort((a, b) => a.index - b.index);

    return sorted.map((item) => ({
      embedding: item.embedding,
      model: data.model,
      dimensions: this.dimensions,
      usage: {
        promptTokens: Math.ceil(data.usage.prompt_tokens / inputs.length),
        totalTokens: Math.ceil(data.usage.total_tokens / inputs.length),
      },
    }));
  }
}

class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseData?: unknown
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}
