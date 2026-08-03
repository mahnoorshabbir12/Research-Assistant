import os
from typing import AsyncGenerator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from app.models.chat import ChatRequest
from app.services.prompts import get_prompt_for_persona

# We use ChatOpenAI because OpenRouter is OpenAI compatible
def get_llm(temperature: float = 0.7):
    return ChatOpenAI(
        model="google/gemini-2.5-flash",
        temperature=temperature,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        streaming=True
    )

def get_chat_chain(persona: str, temperature: float = 0.7):
    llm = get_llm(temperature=temperature)
    
    # Dynamically fetch the correct prompt template for the persona
    prompt = get_prompt_for_persona(persona)
    
    # LCEL pipeline: Prompt -> LLM -> String Output
    return prompt | llm | StrOutputParser()

async def generate_chat_stream(request: ChatRequest) -> AsyncGenerator[str, None]:
    chain = get_chat_chain(persona=request.persona, temperature=request.temperature)
    
    # Convert Pydantic messages to Langchain format
    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Pass user_name and messages to the prompt template execution
    async for chunk in chain.astream({
        "messages": formatted_messages,
        "user_name": request.user_name
    }):
        # Yield Server-Sent Events (SSE) formatted stream
        yield chunk
