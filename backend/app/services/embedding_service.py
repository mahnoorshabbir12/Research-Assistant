import os
import uuid
import chromadb
import pickle
from typing import List, Dict, Any, Optional

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from sentence_transformers import CrossEncoder

# Ensure data directory exists for persistent DB
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "chroma_db")
os.makedirs(DB_PATH, exist_ok=True)

# Persistent ChromaDB client
chroma_client = chromadb.PersistentClient(path=DB_PATH)

# Initialize the embedding model
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize the reranker
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# Get or create the main knowledge base collection
KB_COLLECTION_NAME = "research_knowledge_base"
kb_collection = chroma_client.get_or_create_collection(name=KB_COLLECTION_NAME)

# Langchain Chroma Wrapper
vector_store = Chroma(
    client=chroma_client,
    collection_name=KB_COLLECTION_NAME,
    embedding_function=embeddings
)

# BM25 Initialization
BM25_PATH = os.path.join(DB_PATH, "bm25_index.pkl")
bm25_retriever: Optional[BM25Retriever] = None

def init_bm25():
    global bm25_retriever
    if os.path.exists(BM25_PATH):
        with open(BM25_PATH, "rb") as f:
            bm25_retriever = pickle.load(f)
    else:
        results = kb_collection.get(include=["documents"])
        docs = results.get("documents", [])
        if docs:
            bm25_retriever = BM25Retriever.from_texts(docs)
            with open(BM25_PATH, "wb") as f:
                pickle.dump(bm25_retriever, f)
        else:
            bm25_retriever = None

init_bm25()

def embed_chunks(chunks: List[str]) -> str:
    """
    Takes a list of text chunks, embeds them into a temporary ChromaDB collection,
    and returns the unique collection name (Used for Playground).
    """
    collection_name = f"playground_{uuid.uuid4().hex}"
    
    collection = chroma_client.create_collection(
        name=collection_name
    )
    
    embedded_vectors = embeddings.embed_documents(chunks)
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    
    collection.add(
        documents=chunks,
        embeddings=embedded_vectors,
        ids=ids
    )
    
    return collection_name

def find_similar_chunks(collection_name: str, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Given a temporary collection name and a query, returns top K chunks (Used for Playground).
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception as e:
        raise ValueError(f"Collection {collection_name} not found or expired.")
        
    query_embedding = embeddings.embed_query(query)
    results = collection.query(query_embeddings=[query_embedding], n_results=top_k)
    
    similar_chunks = []
    if results['documents'] and len(results['documents']) > 0:
        docs = results['documents'][0]
        distances = results['distances'][0]
        ids = results['ids'][0]
        
        for i in range(len(docs)):
            similar_chunks.append({
                "id": ids[i],
                "content": docs[i],
                "distance": distances[i]
            })
    return similar_chunks

def ingest_to_knowledge_base(chunks: List[str], metadata: Dict[str, Any], chunk_metadatas: Optional[List[Dict[str, Any]]] = None) -> int:
    """
    Ingest document chunks into the persistent knowledge base.
    Each chunk gets the document's metadata (e.g. filename) plus its own chunk metadata.
    """
    embedded_vectors = embeddings.embed_documents(chunks)
    
    # Generate globally unique IDs for each chunk
    doc_id = uuid.uuid4().hex
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    
    # Attach chunk index and individual chunk metadata to global metadata
    metadatas = []
    for i in range(len(chunks)):
        chunk_meta = metadata.copy()
        chunk_meta["chunk_index"] = i
        if chunk_metadatas and i < len(chunk_metadatas):
            chunk_meta.update(chunk_metadatas[i])
        metadatas.append(chunk_meta)
        
    kb_collection.add(
        documents=chunks,
        embeddings=embedded_vectors,
        ids=ids,
        metadatas=metadatas
    )
    
    # Update BM25 Index
    global bm25_retriever
    all_results = kb_collection.get(include=["documents"])
    all_docs = all_results.get("documents", [])
    if all_docs:
        bm25_retriever = BM25Retriever.from_texts(all_docs)
        with open(BM25_PATH, "wb") as f:
            pickle.dump(bm25_retriever, f)
            
    return len(chunks)

def search_knowledge_base(query: str, top_k: int = 5, filter_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Search the persistent knowledge base using Hybrid Search (BM25 + Vector) 
    and re-rank results using a Cross-Encoder.
    """
    global bm25_retriever
    
    # 1. Retrieval
    # We fetch top_k * 3 chunks to give the reranker a good pool to select from.
    fetch_k = top_k * 3
    
    # Base vector retriever
    vector_retriever = vector_store.as_retriever(
        search_kwargs={"k": fetch_k, "filter": filter_metadata} if filter_metadata else {"k": fetch_k}
    )
    
    if bm25_retriever:
        bm25_retriever.k = fetch_k
        bm25_docs = bm25_retriever.invoke(query)
        vector_docs = vector_retriever.invoke(query)
        
        # Reciprocal Rank Fusion
        rrf_k = 60
        doc_scores = {}
        doc_map = {}
        
        for rank, doc in enumerate(bm25_docs):
            if doc.page_content not in doc_scores:
                doc_scores[doc.page_content] = 0.0
                doc_map[doc.page_content] = doc
            doc_scores[doc.page_content] += 1.0 / (rank + rrf_k)
            
        for rank, doc in enumerate(vector_docs):
            if doc.page_content not in doc_scores:
                doc_scores[doc.page_content] = 0.0
                doc_map[doc.page_content] = doc
            doc_scores[doc.page_content] += 1.0 / (rank + rrf_k)
            
        # Sort by RRF score
        sorted_docs = sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)
        unique_docs = [doc_map[content] for content, score in sorted_docs]
    else:
        docs = vector_retriever.invoke(query)
        # Remove duplicates
        unique_docs = []
        seen = set()
        for doc in docs:
            if doc.page_content not in seen:
                seen.add(doc.page_content)
                unique_docs.append(doc)
            
    if not unique_docs:
        return []

    # 2. Reranking (CrossEncoder)
    # Pair the query with every retrieved document
    pairs = [[query, doc.page_content] for doc in unique_docs]
    scores = reranker.predict(pairs)
    
    # Combine docs with scores and sort descending
    doc_score_pairs = list(zip(unique_docs, scores))
    doc_score_pairs.sort(key=lambda x: x[1], reverse=True)
    
    # 3. Format output
    similar_chunks = []
    for i, (doc, score) in enumerate(doc_score_pairs[:top_k]):
        similar_chunks.append({
            "id": f"result_{i}",  
            "content": doc.page_content,
            "distance": float(score), # We return the CrossEncoder score here instead of distance
            "metadata": doc.metadata
        })
            
    return similar_chunks

def list_knowledge_base_documents() -> List[str]:
    """
    Returns a unique list of filenames currently stored in the knowledge base.
    """
    try:
        # ChromaDB get() returns all documents. We just need the unique filenames from metadata.
        results = kb_collection.get(include=["metadatas"])
        if not results or not results['metadatas']:
            return []
            
        filenames = set()
        for meta in results['metadatas']:
            if meta and "filename" in meta:
                filenames.add(meta["filename"])
                
        return sorted(list(filenames))
    except Exception as e:
        print(f"Error listing documents: {e}")
        return []
