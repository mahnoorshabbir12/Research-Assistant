import os
from typing import AsyncGenerator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from app.models.chat import ChatRequest

# We use ChatOpenAI because OpenRouter is OpenAI compatible
def get_llm(temperature: float = 0.7):
    return ChatOpenAI(
        model="google/gemini-2.5-flash",
        temperature=temperature,
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        streaming=True
    )

system_prompt = """You are an advanced AI Research Assistant. Your primary goal is to help the user with academic, scientific, and general research.
Always base your answers on factual information. When explaining complex concepts, be clear, structured, and concise. 
If you don't know the answer, admit it rather than hallucinating. Prioritize analytical depth and accuracy."""

def get_chat_chain(temperature: float = 0.7):
    llm = get_llm(temperature=temperature)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages")
    ])
    
    # LCEL pipeline: Prompt -> LLM -> String Output
    return prompt | llm | StrOutputParser()

async def generate_chat_stream(request: ChatRequest) -> AsyncGenerator[str, None]:
    chain = get_chat_chain(temperature=request.temperature or 0.7)
    
    # Convert Pydantic messages to Langchain format
    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    async for chunk in chain.astream({"messages": formatted_messages}):
        # Yield Server-Sent Events (SSE) formatted stream
        yield chunk
