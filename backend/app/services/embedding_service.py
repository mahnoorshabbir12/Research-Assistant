import uuid
import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from typing import List, Dict, Any

# In-memory ChromaDB client
# We use this to temporarily store chunks for the Playground
chroma_client = chromadb.Client()

# Initialize the embedding model (this downloads the model on first run)
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def embed_chunks(chunks: List[str]) -> str:
    """
    Takes a list of text chunks, embeds them into a temporary ChromaDB collection,
    and returns the unique collection name.
    """
    collection_name = f"playground_{uuid.uuid4().hex}"
    
    collection = chroma_client.create_collection(
        name=collection_name
    )
    
    # Compute embeddings using Langchain wrapper
    embedded_vectors = embeddings.embed_documents(chunks)
    
    # Generate IDs
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    
    # Add to ChromaDB
    collection.add(
        documents=chunks,
        embeddings=embedded_vectors,
        ids=ids
    )
    
    return collection_name

def find_similar_chunks(collection_name: str, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Given a collection name and a query, returns the top K most similar chunks.
    """
    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception as e:
        raise ValueError(f"Collection {collection_name} not found or expired.")
        
    query_embedding = embeddings.embed_query(query)
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )
    
    similar_chunks = []
    if results['documents'] and len(results['documents']) > 0:
        docs = results['documents'][0]
        distances = results['distances'][0]
        ids = results['ids'][0]
        
        for i in range(len(docs)):
            similar_chunks.append({
                "id": ids[i],
                "content": docs[i],
                # Distance in Chroma is L2 by default. Smaller is better.
                "distance": distances[i]
            })
            
    return similar_chunks
