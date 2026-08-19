# ADR 004: Evaluation Framework

## 1. Context
To measure the effectiveness of our RAG (Retrieval-Augmented Generation) pipeline, we needed a robust, automated evaluation framework. As the ingestion process and retrieval strategies evolve (from BM25 to Hybrid to Reranking), having a numerical benchmark helps identify whether changes actually improve the pipeline's output.

## 2. Decision
We have decided to adopt **Ragas (Retrieval Augmented Generation Assessment)** as our core evaluation framework.

### Why Ragas?
- It splits RAG evaluation into specific actionable metrics: **Context Precision**, **Context Recall**, **Faithfulness**, and **Answer Relevancy**.
- It leverages LLM-as-a-judge, which makes it scalable and removes the need for highly manual human grading.
- It integrates seamlessly with our existing LangChain components and HuggingFace models.

### Metrics Selected
- **Context Precision:** Measures whether the relevant chunks are ranked higher than irrelevant ones. 
- **Context Recall:** Measures if all the relevant information required to answer the question was successfully retrieved.
- **Faithfulness:** Ensures the generated answer is derived strictly from the retrieved context (minimizes hallucination).
- **Answer Relevancy:** Measures how well the generated answer addresses the actual user query.

### LLM Judge
- To keep the evaluation process cost-effective and local-friendly, we opted to use **OpenRouter's free tier** (`openrouter/free`) as the evaluator LLM rather than expensive closed-source models. 
- We are using a local `HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")` to power the semantic similarity checks inside the Ragas metrics (like Answer Relevancy).

## 3. Implementation Details
- **Golden Dataset:** We defined a baseline dataset (`eval/golden_dataset.json`) containing queries, context arrays, and expected ground-truth answers based on our current documents.
- **Test Runner (`eval/run_eval.py`):** Automatically injects queries into our Hybrid Search pipeline, retrieves the actual contexts, generates a naive response, and runs the Ragas metrics against the results.
- **Artifacts:** Output scores are exported to a CSV file (`eval/evaluation_results.csv`) for future comparisons.

## 4. Consequences
- **Pros:** We now have an automated, reproducible way to measure search quality. Any future regressions in parsing (Phase 1) or retrieval (Phase 2) will be caught.
- **Cons:** Free LLM endpoints (like `openrouter/free`) can sometimes timeout or return inconsistently formatted JSON, causing occasional `OutputParserException` or `TimeoutError` exceptions during Ragas evaluation runs. To mitigate this for production-grade evaluations, a dedicated open-source endpoint (e.g., vLLM hosting Llama-3) or a reliable paid API should be substituted.
