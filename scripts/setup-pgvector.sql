-- PostgreSQL Setup Script for Hepta Analytics
-- Run this script as a superuser before running drizzle migrations

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Verify extension is installed
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 3. After running drizzle-kit push, create the HNSW index:
-- CREATE INDEX embeddings_vector_idx
--   ON embeddings
--   USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);

-- Performance tuning notes:
-- - m: Maximum number of connections per node (default 16, higher = more accurate but slower)
-- - ef_construction: Size of dynamic candidate list during index construction (default 64)
-- - For production with >100k embeddings, consider: m=32, ef_construction=128

-- Query tuning:
-- SET hnsw.ef_search = 100;  -- Higher = more accurate but slower queries
