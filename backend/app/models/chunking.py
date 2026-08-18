from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ChunkRequest(BaseModel):
    text: Optional[str] = None
    elements: Optional[List[Dict[str, Any]]] = None
    chunk_size: int = Field(default=1000, ge=100)
    chunk_overlap: int = Field(default=200, ge=0)
    strategy: str = Field(default="recursive")  # 'recursive' or 'token'
