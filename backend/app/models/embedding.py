from pydantic import BaseModel
from typing import List, Optional

class EmbedRequest(BaseModel):
    chunks: List[str]

class SimilarityRequest(BaseModel):
    collection_name: str
    query: str
    top_k: int = 3
