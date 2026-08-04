from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class EmbedRequest(BaseModel):
    chunks: List[str]

class SimilarityRequest(BaseModel):
    collection_name: str
    query: str
    top_k: int = 3

class IngestRequest(BaseModel):
    chunks: List[str]
    metadata: Dict[str, Any]

class KnowledgeSearchRequest(BaseModel):
    query: str
    top_k: int = 5
    filter_metadata: Optional[Dict[str, Any]] = None
