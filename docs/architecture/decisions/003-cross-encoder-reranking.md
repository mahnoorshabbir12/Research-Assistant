# 003. Cross-Encoder Reranking
Date: 2026-08-18
Status: accepted

## Context
After implementing Hybrid Search, our recall (finding the right chunks) is high, but our precision (putting the absolute best chunk at rank #1) needed improvement. Bi-Encoders (standard embeddings) compare documents quickly but lack deep contextual reasoning between the specific words of the query and the document.

## Decision
We implemented a final Re-ranking step using a local Cross-Encoder model (`cross-encoder/ms-marco-MiniLM-L-6-v2`) via `sentence-transformers`.
1. The Hybrid Search fetches a wide net of candidate chunks (`top_k * 3`).
2. The Cross-Encoder evaluates the exact pair of `[query, document]` and assigns a highly accurate relevance score.
3. We sort by this score to return the final `top_k`.

## Alternatives
- **LLM as a Judge (GPT-4):** Rejected due to massive latency (seconds per query) and per-query API costs.
- **Hosted Rerank API (Cohere):** Rejected to keep the system entirely local, self-contained, and free of external API dependencies.

## Consequences
- **Pros:** Drastically higher precision for the top results fed to the LLM generation step.
- **Cons:** Requires an additional 90MB local model download. Cross-encoding is compute-heavy, so we must strictly limit the initial retrieval pool to avoid stalling the search API.
