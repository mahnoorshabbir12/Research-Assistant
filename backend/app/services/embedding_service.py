import os
import uuid
import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from typing import List, Dict, Any, Optional

# Ensure data directory exists for persistent DB
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "chroma_db")
os.makedirs(DB_PATH, exist_ok=True)

# Persistent ChromaDB client
chroma_client = chromadb.PersistentClient(path=DB_PATH)

# Initialize the embedding model
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Get or create the main knowledge base collection
KB_COLLECTION_NAME = "research_knowledge_base"
kb_collection = chroma_client.get_or_create_collection(name=KB_COLLECTION_NAME)

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

def ingest_to_knowledge_base(chunks: List[str], metadata: Dict[str, Any]) -> int:
    """
    Ingest document chunks into the persistent knowledge base.
    Each chunk gets the document's metadata (e.g. filename).
    """
    embedded_vectors = embeddings.embed_documents(chunks)
    
    # Generate globally unique IDs for each chunk
    doc_id = uuid.uuid4().hex
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    
    # Attach chunk index to metadata
    metadatas = []
    for i in range(len(chunks)):
        chunk_meta = metadata.copy()
        chunk_meta["chunk_index"] = i
        metadatas.append(chunk_meta)
        
    kb_collection.add(
        documents=chunks,
        embeddings=embedded_vectors,
        ids=ids,
        metadatas=metadatas
    )
    return len(chunks)

def search_knowledge_base(query: str, top_k: int = 5, filter_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Search the persistent knowledge base.
    """
    query_embedding = embeddings.embed_query(query)
    
    kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": top_k
    }
    if filter_metadata:
        kwargs["where"] = filter_metadata
        
    results = kb_collection.query(**kwargs)
    
    similar_chunks = []
    if results['documents'] and len(results['documents']) > 0:
        docs = results['documents'][0]
        distances = results['distances'][0]
        ids = results['ids'][0]
        metadatas = results['metadatas'][0] if results['metadatas'] else [{}] * len(docs)
        
        for i in range(len(docs)):
            similar_chunks.append({
                "id": ids[i],
                "content": docs[i],
                "distance": distances[i],
                "metadata": metadatas[i]
            })
            
    return similar_chunks
