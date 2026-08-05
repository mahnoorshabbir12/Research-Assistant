import os
import json
from datetime import datetime
from typing import AsyncGenerator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
os.environ["LANGCHAIN_OPENAI_STREAM_CHUNK_TIMEOUT_S"] = "0"

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from app.models.chat import ChatRequest
from app.models.structured import Quiz, FlashcardDeck
from app.services.prompts import get_prompt_for_persona, quiz_prompt, flashcard_prompt
from app.services.embedding_service import search_knowledge_base
from langgraph.prebuilt import create_react_agent
from app.services.tools import AVAILABLE_TOOLS

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
    prompt_template = get_prompt_for_persona(persona)
    
    # In newer LangChain versions, we use langgraph for tool agents
    agent = create_react_agent(model=llm, tools=AVAILABLE_TOOLS)
    
    # Create an adapter to format the inputs and invoke the agent
    async def agent_adapter(inputs: dict, config: dict):
        sys_template = prompt_template.messages[0].prompt
        sys_msg = sys_template.format(
            user_name=inputs.get("user_name", "User"),
            current_date=datetime.now().strftime("%B %d, %Y"),
            current_day=datetime.now().strftime("%A")
        )
        
        messages = [{"role": "system", "content": sys_msg}]
        
        # Build full messages array from the frontend history
        for msg in inputs.get("messages", []):
            if msg.role == "user" and not msg.type:
                messages.append({"role": "user", "content": msg.content})
            elif msg.role == "assistant" and not msg.type and msg.content:
                messages.append({"role": "assistant", "content": msg.content})
            elif msg.role == "user" and msg.type == "document":
                # Special handling for document attachment messages if any logic needs it
                messages.append({"role": "user", "content": msg.content})
        
        # Use ainvoke to get the final state dict while still allowing astream_events to catch events
        result = await agent.ainvoke({"messages": messages}, config)
        return result["messages"][-1]
        
    from langchain_core.runnables import RunnableLambda
    return RunnableLambda(agent_adapter)

async def generate_chat_stream(request: ChatRequest) -> AsyncGenerator[str, None]:
    chain = get_chat_chain(persona=request.persona, temperature=request.temperature)
    
    async for event in chain.astream_events(
        {"messages": request.messages, "user_name": request.user_name},
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
    
    messages = []
    for msg in request.messages:
        if msg.role == 'user' and not msg.type:
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == 'assistant' and not msg.type and msg.content:
            messages.append(AIMessage(content=msg.content))
    
    return await chain.ainvoke({
        "history": messages,
        "format_instructions": parser.get_format_instructions()
    })

async def generate_flashcards_from_history(request: ChatRequest) -> FlashcardDeck:
    llm = get_llm(temperature=0.3)
    parser = PydanticOutputParser(pydantic_object=FlashcardDeck)
    chain = flashcard_prompt | llm | parser
    
    messages = []
    for msg in request.messages:
        if msg.role == 'user' and not msg.type:
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == 'assistant' and not msg.type and msg.content:
            messages.append(AIMessage(content=msg.content))
    
    return await chain.ainvoke({
        "history": messages,
        "format_instructions": parser.get_format_instructions()
    })

