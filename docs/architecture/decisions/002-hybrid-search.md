# 002. Hybrid Search Implementation
Date: 2026-08-18
Status: accepted

## Context
The previous system relied solely on ChromaDB for dense vector similarity search. While this is excellent for conceptual queries, it often fails when users query exact strings (like specific IDs, acronyms, or names) because embeddings map exact keywords into broad semantic spaces.

## Decision
We implemented a Hybrid Search model using Reciprocal Rank Fusion (RRF). 
1. We run parallel searches: Semantic Search (ChromaDB) and Keyword Search (BM25 via `rank_bm25`).
2. We merge the results using RRF, which scores documents based on their position `1 / (Rank + K)` rather than their raw distance.
3. The BM25 index state is persisted locally to `data/bm25_index.pkl` alongside the ChromaDB SQLite files to ensure fast boot times.

## Alternatives
- **Elasticsearch / Postgres pgvector:** Rejected because migrating to a full persistent database infrastructure is too heavy for the current MVP phase.
- **Rebuilding BM25 Dynamically on Query:** Rejected because loading all documents on every query is O(N) and far too slow.

## Consequences
- **Pros:** Massively improved recall for exact keyword queries without sacrificing semantic understanding.
- **Cons:** Two systems of record (ChromaDB and Pickle) exist on disk. They must be kept strictly in sync during the `ingest` phase, risking drift if the process crashes midway.
