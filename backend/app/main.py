import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest
from app.services.llm_service import generate_chat_stream, generate_quiz_from_history, generate_flashcards_from_history
from app.services.document_service import process_uploaded_file

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

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Save file to a temporary location
    try:
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name
            
        # Process the file
        result = await process_uploaded_file(temp_path, file.filename)
        
        # Clean up
        os.unlink(temp_path)
        return result
    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)
        raise HTTPException(status_code=500, detail=str(e))
