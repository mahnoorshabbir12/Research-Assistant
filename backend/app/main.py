import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest
from app.models.chunking import ChunkRequest
from app.models.embedding import EmbedRequest, SimilarityRequest, IngestRequest, KnowledgeSearchRequest
from app.services.llm_service import generate_chat_stream, generate_quiz_from_history, generate_flashcards_from_history
from app.services.document_service import process_uploaded_file
from app.services.chunking_service import chunk_document
from app.services.embedding_service import embed_chunks, find_similar_chunks, ingest_to_knowledge_base, search_knowledge_base

app = FastAPI(
    title="AI Research Assistant API",
    description="Backend API for the AI Research Assistant",
    version="1.0.0"
)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
    try:
        return StreamingResponse(
            generate_chat_stream(request),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate/quiz")
async def generate_quiz_endpoint(request: ChatRequest):
    try:
        quiz = await generate_quiz_from_history(request)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate/flashcards")
async def generate_flashcards_endpoint(request: ChatRequest):
    try:
        deck = await generate_flashcards_from_history(request)
        return deck
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@app.post("/api/document/chunk")
async def chunk_document_endpoint(request: ChunkRequest):
    try:
        result = chunk_document(
            text=request.text,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            strategy=request.strategy
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/document/embed")
async def embed_document_endpoint(request: EmbedRequest):
    try:
        collection_name = embed_chunks(request.chunks)
        return {"collection_name": collection_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/document/similarity")
async def similarity_endpoint(request: SimilarityRequest):
    try:
        similar_chunks = find_similar_chunks(
            collection_name=request.collection_name,
            query=request.query,
            top_k=request.top_k
        )
        return {"similar_chunks": similar_chunks}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/knowledge-base/ingest")
async def kb_ingest_endpoint(request: IngestRequest):
    try:
        num_chunks = ingest_to_knowledge_base(
            chunks=request.chunks,
            metadata=request.metadata
        )
        return {"message": "Success", "chunks_added": num_chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/knowledge-base/search")
async def kb_search_endpoint(request: KnowledgeSearchRequest):
    try:
        results = search_knowledge_base(
            query=request.query,
            top_k=request.top_k,
            filter_metadata=request.filter_metadata
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
