from typing import List, Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter, TokenTextSplitter

def chunk_document(text: Optional[str] = None, elements: Optional[List[Dict[str, Any]]] = None, chunk_size: int = 1000, chunk_overlap: int = 200, strategy: str = "recursive") -> Dict[str, Any]:
    """
    Splits the provided text or elements into chunks using the specified strategy, retaining metadata.
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
        
    final_chunks = []
    
    if elements:
        for el in elements:
            el_text = el.get("content", "")
            el_type = el.get("metadata", {}).get("content_type", "text")
            
            if not el_text or not str(el_text).strip():
                continue
                
            split_texts = splitter.split_text(str(el_text))
            for split_text in split_texts:
                final_chunks.append({
                    "content": split_text,
                    "metadata": {"content_type": el_type}
                })
    elif text:
        split_texts = splitter.split_text(text)
        for split_text in split_texts:
            final_chunks.append({
                "content": split_text,
                "metadata": {"content_type": "text"}
            })
    
    # We still return 'chunks' as a list of strings for backwards compatibility if needed, 
    # but 'chunk_objects' contains the rich metadata.
    return {
        "num_chunks": len(final_chunks),
        "strategy": strategy,
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "chunks": [c["content"] for c in final_chunks],
        "chunk_objects": final_chunks
    }
