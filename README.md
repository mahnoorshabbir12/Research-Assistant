# AI Research Assistant

This is an AI Research Assistant built with a FastAPI backend and a React (Vite) frontend.

## RAG Implementation Architecture

The Retrieval-Augmented Generation (RAG) pipeline in this application is robust, running largely locally, and implemented using the **Agent Tool** paradigm rather than a rigid, hardcoded semantic search. 

Here is exactly how RAG is implemented, broken down by the concepts and libraries we used:

### 1. Document Extraction & Loading
When a user uploads a document, it is handled by `backend/app/services/document_service.py`.
* **Libraries Used**: `pypdf`, `docx2txt`, and `langchain_community` (Document Loaders).
* **Concept**: Before you can embed a document, you have to rip the raw text out of it. We use LangChain's `PyPDFLoader` and `Docx2txtLoader` because they are standardized and reliably handle pagination and character encodings.

### 2. Chunking (Text Splitting)
The raw text is then sent to `backend/app/services/chunking_service.py`.
* **Libraries Used**: `langchain_text_splitters`
* **Concept**: LLMs have limited context windows, and embedding models can only process a certain amount of text at once. We use the **`RecursiveCharacterTextSplitter`** (defaulting to 1000 characters with a 200-character overlap). 
* **Why?**: The recursive splitter is the industry standard because it tries to split on paragraphs first, then sentences, and finally words. This ensures that semantic concepts aren't severed in the middle of a sentence, and the overlap ensures context flows smoothly between chunks.

### 3. Embedding the Data
Chunks are transformed into vectors in `backend/app/services/embedding_service.py`.
* **Libraries Used**: `sentence-transformers` and `langchain-huggingface`.
* **Concept**: Text chunks need to be converted into mathematical arrays (vectors) so we can measure the "distance" (similarity) between a user's question and a piece of text.
* **Why?**: Instead of paying for OpenAI's embedding API, we used the `HuggingFaceEmbeddings` model specifically configured to use **`all-MiniLM-L6-v2`**. This is a fast, lightweight, and highly effective open-source model that runs completely locally on your CPU, saving money and increasing privacy.

### 4. Vector Storage
The vectors and their associated text are stored persistently.
* **Libraries Used**: `chromadb`
* **Concept**: We need a database designed to store arrays of numbers and perform fast cosine-similarity searches. 
* **Why ChromaDB?**: We used Chroma as a `PersistentClient` saving to the local `./data/chroma_db` directory. Chroma is excellent for this because it's embedded; it doesn't require setting up a separate Docker container, Postgres database, or cloud service. It runs natively alongside the FastAPI app.

### 5. Retrieval via Agent Tooling
This is the most sophisticated part of the implementation (`backend/app/services/tools.py` and `llm_service.py`).
* **Libraries Used**: `langgraph` (for the ReAct agent).
* **Concept**: Instead of rigidly doing a vector search every single time the user sends a message (which injects useless context if the user just says "Hello"), we gave the RAG capabilities to the LLM as a **Tool** called `search_documents`.
* **Why?**: By structuring the application as a ReAct (Reasoning and Acting) Agent, the LLM reads the user's prompt, *realizes* it needs more information from the uploaded files, and autonomously calls the `search_documents(query, filename)` tool. The tool embeds the LLM's query, fetches the top 3 chunks from ChromaDB, and passes them back to the LLM so it can construct its final answer. 

This architecture allows the AI to answer casual questions directly, but pull from the local knowledge base on-demand when asked about your specific research.
