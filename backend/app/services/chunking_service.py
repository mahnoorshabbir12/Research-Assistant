from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter, TokenTextSplitter

def chunk_document(text: str, chunk_size: int = 1000, chunk_overlap: int = 200, strategy: str = "recursive") -> Dict[str, Any]:
    """
    Splits the provided text into chunks using the specified strategy.
    """
    
    if strategy == "recursive":
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            is_separator_regex=False,
        )
    elif strategy == "token":
        splitter = TokenTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
    else:
        raise ValueError(f"Unsupported chunking strategy: {strategy}")
        
    # Split the text
    chunks = splitter.split_text(text)
    
    return {
        "num_chunks": len(chunks),
        "strategy": strategy,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "chunks": chunks
    }
