import os
from typing import AsyncGenerator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
import os
os.environ["LANGCHAIN_OPENAI_STREAM_CHUNK_TIMEOUT_S"] = "0"

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from app.models.chat import ChatRequest
from app.models.structured import Quiz, FlashcardDeck
from app.services.prompts import get_prompt_for_persona, quiz_prompt, flashcard_prompt

# We use ChatOpenAI because OpenRouter is OpenAI compatible
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

async def generate_quiz_from_history(request: ChatRequest) -> Quiz:
    llm = get_llm(temperature=0.3) # Lower temp for structured tasks
    parser = PydanticOutputParser(pydantic_object=Quiz)
    chain = quiz_prompt | llm | parser
    
    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    return await chain.ainvoke({
        "messages": formatted_messages,
        "format_instructions": parser.get_format_instructions()
    })

async def generate_flashcards_from_history(request: ChatRequest) -> FlashcardDeck:
    llm = get_llm(temperature=0.3)
    parser = PydanticOutputParser(pydantic_object=FlashcardDeck)
    chain = flashcard_prompt | llm | parser
    
    formatted_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    return await chain.ainvoke({
        "messages": formatted_messages,
        "format_instructions": parser.get_format_instructions()
    })
