from pydantic import BaseModel, Field
from typing import Optional

class ChunkRequest(BaseModel):
    text: str
    chunk_size: int = Field(default=1000, ge=100)
    chunk_overlap: int = Field(default=200, ge=0)
    strategy: str = Field(default="recursive")  # 'recursive' or 'token'
