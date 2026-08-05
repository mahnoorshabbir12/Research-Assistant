import os
import json
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

from langchain.agents import create_tool_calling_agent, AgentExecutor
from app.services.tools import AVAILABLE_TOOLS

def get_chat_chain(persona: str, temperature: float = 0.7):
    llm = get_llm(temperature=temperature)
    prompt = get_prompt_for_persona(persona)
    
    agent = create_tool_calling_agent(llm, AVAILABLE_TOOLS, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=AVAILABLE_TOOLS, verbose=True)
    
    # Wrap the agent with memory
    return RunnableWithMessageHistory(
        agent_executor,
        get_session_history,
        input_messages_key="input",
        history_messages_key="history",
    )

async def generate_chat_stream(request: ChatRequest) -> AsyncGenerator[str, None]:
    chain = get_chat_chain(persona=request.persona, temperature=request.temperature)
    
    # Filter out non-user messages to find the actual query from the payload
    user_messages = [msg for msg in request.messages if msg.role == "user" and not msg.type]
    latest_query = user_messages[-1].content if user_messages else ""
    
    if latest_query:
        async for event in chain.astream_events(
            {"input": latest_query, "user_name": request.user_name, "context": ""},
            config={"configurable": {"session_id": request.session_id}},
            version="v2"
        ):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'content', 'data': content})}\n\n"
            elif kind == "on_tool_start":
                tool_name = event["name"]
                yield f"data: {json.dumps({'type': 'log', 'data': f'Starting {tool_name}...'})}\n\n"
            elif kind == "on_tool_end":
                tool_name = event["name"]
                yield f"data: {json.dumps({'type': 'log', 'data': f'Finished {tool_name}'})}\n\n"
            elif kind == "on_chat_model_end":
                usage = event["data"].get("output", {}).response_metadata.get("token_usage")
                if usage:
                    yield f"data: {json.dumps({'type': 'usage', 'data': usage})}\n\n"

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
