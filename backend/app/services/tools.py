from datetime import datetime
from typing import Optional
from langchain_core.tools import tool
from ddgs import DDGS
from app.services.embedding_service import search_knowledge_base, list_knowledge_base_documents

@tool
def calculate(expression: str) -> str:
    """Evaluates a mathematical expression safely. Use this when the user asks you to perform math.
    CRITICAL: You MUST pass the user's expression EXACTLY as they wrote it. Do NOT rewrite, factor, simplify, or reinterpret the expression in any way. For example, if the user writes '33*67', pass '33*67' — not '3*3*67' or any other equivalent form."""
    try:
        allowed_chars = "0123456789+-*/(). %^"
        if not all(c in allowed_chars for c in expression):
            return "Error: Invalid characters in expression."
        safe_expr = expression.replace("^", "**")
        result = eval(safe_expr)
        if isinstance(result, float) and result == int(result):
            result = int(result)
        return str(result)
    except Exception as e:
        return f"Error: {e}"

@tool
def get_current_time() -> str:
    """Returns the current date and time. Use this when the user asks for the time, date, or day of the week."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

@tool
def search_web(query: str) -> str:
    """Searches the live internet for information. Use this when the user asks about recent events, news, or general knowledge not found in their documents."""
    try:
        results = DDGS().text(query, max_results=3)
        if not results:
            return "No web results found."
        
        formatted = "--- WEB RESULTS ---\n"
        for i, res in enumerate(results):
            formatted += f"[{i+1}]: {res['title']}\n{res['body']}\n\n"
        return formatted
    except Exception as e:
        return f"Error searching the web: {e}"

@tool
def list_documents() -> str:
    """Lists all the document filenames currently available in the user's uploaded Knowledge Base. Use this to see what files you can search and compare."""
    try:
        filenames = list_knowledge_base_documents()
        if not filenames:
            return "No documents found in the Knowledge Base."
        return "Available Documents:\n- " + "\n- ".join(filenames)
    except Exception as e:
        return f"Error listing documents: {e}"

@tool
def search_documents(query: str, filename: Optional[str] = None) -> str:
    """Searches the user's uploaded knowledge base documents. Use this when the user asks a specific question about their research, notes, or uploaded files. Provide an optional 'filename' to restrict the search to a specific document."""
    try:
        filter_meta = {"filename": filename} if filename else None
        kb_results = search_knowledge_base(query=query, top_k=3, filter_metadata=filter_meta)
        if not kb_results:
            return f"No relevant documents found in the Knowledge Base for query '{query}'" + (f" in {filename}." if filename else ".")
            
        context_str = "--- KNOWLEDGE BASE CONTEXT ---\n"
        for i, res in enumerate(kb_results):
            doc_name = res["metadata"].get("filename", "Unknown Document")
            context_str += f"[{doc_name} (Chunk {i+1})]:\n{res['content']}\n\n"
        return context_str
    except Exception as e:
        return f"Error searching documents: {e}"

# List of all available tools
AVAILABLE_TOOLS = [calculate, get_current_time, search_web, list_documents, search_documents]
