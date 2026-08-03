import os
from typing import Dict, Any
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader

async def process_uploaded_file(file_path: str, filename: str) -> Dict[str, Any]:
    """
    Parses an uploaded file and returns its extracted text and metadata.
    """
    ext = os.path.splitext(filename)[1].lower()
    
    try:
        if ext == '.pdf':
            loader = PyPDFLoader(file_path)
            docs = loader.load()
        elif ext == '.docx':
            loader = Docx2txtLoader(file_path)
            docs = loader.load()
        elif ext == '.txt':
            loader = TextLoader(file_path, encoding='utf-8')
            docs = loader.load()
        else:
            raise ValueError(f"Unsupported file type: {ext}")
            
        # Combine text from all pages
        full_text = "\n\n".join([doc.page_content for doc in docs])
        
        # Calculate some basic metadata
        metadata = {
            "filename": filename,
            "type": ext.replace('.', '').upper(),
            "pages": len(docs) if ext == '.pdf' else 1,
            "character_count": len(full_text)
        }
        
        return {
            "content": full_text,
            "metadata": metadata
        }
    except Exception as e:
        raise RuntimeError(f"Error processing document: {str(e)}")
