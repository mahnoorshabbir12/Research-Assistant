import asyncio
from app.models.chat import ChatRequest, Message
from app.services.llm_service import generate_quiz_from_history

async def main():
    req = ChatRequest(
        messages=[Message(role="user", content="Explain quantum physics")],
        persona="researcher",
        user_name="Test"
    )
    try:
        quiz = await generate_quiz_from_history(req)
        print(quiz)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
