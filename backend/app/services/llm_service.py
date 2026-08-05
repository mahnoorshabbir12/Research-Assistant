import os
from typing import AsyncGenerator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
os.environ["LANGCHAIN_OPENAI_STREAM_CHUNK_TIMEOUT_S"] = "0"

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import SQLChatMessageHistory
from app.models.chat import ChatRequest
from app.models.structured import Quiz, FlashcardDeck
from app.services.prompts import get_prompt_for_persona, quiz_prompt, flashcard_prompt
from app.services.embedding_service import search_knowledge_base

DB_URI = f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'memory.db')}"

def get_session_history(session_id: str):
    return SQLChatMessageHistory(session_id=session_id, connection_string=DB_URI)

def get_llm(temperature: float = 0.7):
    return ChatOpenAI(
        model="openai/gpt-4o-mini",
        temperature=temperature,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        streaming=True,
        max_tokens=4096
    )

def get_chat_chain(persona: str, temperature: float = 0.7):
    llm = get_llm(temperature=temperature)
    prompt = get_prompt_for_persona(persona)
    
    chain = prompt | llm | StrOutputParser()
    
    # Wrap the chain with memory
    return RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="history",
    )

async def generate_chat_stream(request: ChatRequest) -> AsyncGenerator[str, None]:
    chain = get_chat_chain(persona=request.persona, temperature=request.temperature)
    
    context_str = ""
    # Filter out non-user messages to find the actual query from the payload
    # Note: frontend still sends history but backend only uses the LAST message and relies on SQLite memory.
    user_messages = [msg for msg in request.messages if msg.role == "user" and not msg.type]
    latest_query = user_messages[-1].content if user_messages else ""
    
    if latest_query:
        try:
            kb_results = search_knowledge_base(query=latest_query, top_k=3)
            if kb_results:
                context_str = "--- KNOWLEDGE BASE CONTEXT ---\n"
                for i, res in enumerate(kb_results):
                    filename = res["metadata"].get("filename", "Unknown Document")
                    context_str += f"[{filename} (Chunk {i+1})]:\n{res['content']}\n\n"
                context_str += "------------------------------\n"
        except Exception as e:
            print(f"Failed to search KB: {e}")
            pass
    
    async for chunk in chain.astream(
        {"input": latest_query, "user_name": request.user_name, "context": context_str},
        config={"configurable": {"session_id": request.session_id}}
    ):
        yield chunk

async def generate_quiz_from_history(request: ChatRequest) -> Quiz:
    llm = get_llm(temperature=0.3)
    parser = PydanticOutputParser(pydantic_object=Quiz)
    chain = quiz_prompt | llm | parser
    
    # Fetch history directly from SQLite
    history = get_session_history(request.session_id)
    
    return await chain.ainvoke({
        "history": history.messages,
        "format_instructions": parser.get_format_instructions()
    })

async def generate_flashcards_from_history(request: ChatRequest) -> FlashcardDeck:
    llm = get_llm(temperature=0.3)
    parser = PydanticOutputParser(pydantic_object=FlashcardDeck)
    chain = flashcard_prompt | llm | parser
    
    history = get_session_history(request.session_id)
    
    return await chain.ainvoke({
        "history": history.messages,
        "format_instructions": parser.get_format_instructions()
    })
