-- Migration: Initialize pgvector extension
-- Required for semantic search functionality

-- Enable pgvector extension (requires superuser or rds_superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for fast similarity search on embeddings
-- Run this after the embeddings table is created by Drizzle
-- CREATE INDEX IF NOT EXISTS embeddings_vector_idx
--   ON embeddings
--   USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);

-- Note: The index creation is commented out because:
-- 1. The table must exist first (created by drizzle-kit push)
-- 2. HNSW indexes can be slow to build on large datasets
-- 3. You may want to tune m and ef_construction for your use case

-- To enable the index after table creation, run:
-- CREATE INDEX embeddings_vector_idx ON embeddings USING hnsw (embedding vector_cosine_ops);
