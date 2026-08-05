from pydantic import BaseModel
from typing import List, Optional

class Message(BaseModel):
    role: str
    content: str = ""
    type: Optional[str] = None
    data: Optional[dict] = None

class ChatRequest(BaseModel):
    messages: List[Message]
    session_id: str
    temperature: Optional[float] = 0.7
    persona: Optional[str] = "researcher"
    user_name: Optional[str] = "User"
