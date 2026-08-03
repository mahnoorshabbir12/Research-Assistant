from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest
from app.services.llm_service import generate_chat_stream, generate_quiz_from_history, generate_flashcards_from_history

app = FastAPI(
    title="AI Research Assistant API",
    description="Backend API for the AI Research Assistant",
    version="1.0.0",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production to the frontend's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Research Assistant API!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        generate_chat_stream(request), 
        media_type="text/event-stream"
    )

@app.post("/api/generate/quiz")
async def quiz_endpoint(request: ChatRequest):
    quiz = await generate_quiz_from_history(request)
    return quiz

@app.post("/api/generate/flashcards")
async def flashcards_endpoint(request: ChatRequest):
    flashcards = await generate_flashcards_from_history(request)
    return flashcards
