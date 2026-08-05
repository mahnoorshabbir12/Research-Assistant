from datetime import datetime
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import SQLChatMessageHistory
from langgraph.prebuilt import create_react_agent
import os
from dotenv import load_dotenv

load_dotenv()

DB_URI = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'data', 'test_memory.db')}"

def get_session_history(session_id: str):
    return SQLChatMessageHistory(session_id=session_id, connection=DB_URI, async_mode=True)

def get_test_chain():
    llm = ChatOpenAI(model="openai/gpt-4o-mini", temperature=0)
    agent = create_react_agent(model=llm, tools=[])
    
    def _format_for_agent(inputs: dict):
        sys_msg = f"You are a helpful assistant. User is {inputs.get('user_name')}."
        messages = [SystemMessage(content=sys_msg)]
        messages.extend(inputs.get("history", []))
        messages.append(HumanMessage(content=inputs.get("input", "")))
        return {"messages": messages}
        
    def _extract_final_message(output: dict):
        return output["messages"][-1]
        
    runnable_agent = _format_for_agent | agent | _extract_final_message
    
    return RunnableWithMessageHistory(
        runnable_agent,
        get_session_history,
        input_messages_key="input",
        history_messages_key="history",
    )

async def run_test():
    chain = get_test_chain()
    
    # Test simple invoke
    print("Testing invoke...")
    res = chain.invoke(
        {"input": "Hello, my name is Alice", "user_name": "Alice"},
        config={"configurable": {"session_id": "test1"}}
    )
    print("Invoke output:", res)
    
    print("Testing memory invoke...")
    res2 = chain.invoke(
        {"input": "What is my name?", "user_name": "Alice"},
        config={"configurable": {"session_id": "test1"}}
    )
    print("Memory output:", res2)
    
    # Test astream_events
    print("\nTesting astream_events...")
    async for event in chain.astream_events(
        {"input": "Tell me a short joke", "user_name": "Alice"},
        config={"configurable": {"session_id": "test2"}},
        version="v2"
    ):
        kind = event["event"]
        if kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                print(content, end="", flush=True)

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_test())
