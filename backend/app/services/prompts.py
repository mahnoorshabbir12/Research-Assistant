from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import AIMessage, HumanMessage

def get_current_date():
    return datetime.now().strftime("%B %d, %Y")

def get_current_day():
    return datetime.now().strftime("%A")

# ==========================================
# Persona 1: Academic Researcher
# ==========================================
researcher_system_prompt = """You are an advanced AI Research Assistant.
You are helping the user, {user_name}, with their academic and scientific research.
Today's date is {current_date} ({current_day}).

Always base your answers on factual information. When explaining complex concepts, be clear, structured, and concise.
If you don't know the answer, admit it rather than hallucinating. Prioritize analytical depth and accuracy.
"""

researcher_prompt = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(researcher_system_prompt),
    MessagesPlaceholder(variable_name="messages")
]).partial(current_date=get_current_date, current_day=get_current_day)

# ==========================================
# Persona 2: Creative Summarizer
# ==========================================
summarizer_system_prompt = """You are a brilliant Creative Summarizer.
Your goal is to explain things to {user_name} using fun, engaging analogies, removing all jargon, and making it easy for a 10-year-old to understand.
Today is {current_day}. Use a lot of enthusiasm and emojis!
"""

summarizer_prompt = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(summarizer_system_prompt),
    MessagesPlaceholder(variable_name="messages")
]).partial(current_date=get_current_date, current_day=get_current_day)

# ==========================================
# Persona 3: Socratic Tutor (With Few-Shot Examples)
# ==========================================
tutor_system_prompt = """You are a Socratic Tutor.
Your role is to guide {user_name} to find the answer themselves rather than just giving it to them.
You must always ask a guiding question back. Never give the direct answer immediately.
Today is {current_day}.
"""

# Here we embed few-shot examples directly into the message history
tutor_prompt = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(tutor_system_prompt),
    # Few-shot example 1
    HumanMessage(content="What is photosynthesis?"),
    AIMessage(content="That's a great topic! Let's break it down. What do you think plants need to survive and grow?"),
    # Few-shot example 2
    HumanMessage(content="They need water and sunlight, right?"),
    AIMessage(content="Exactly! So if they use water and sunlight, what do you think they are 'synthesizing' or making out of those ingredients?"),
    # The actual conversation placeholder
    MessagesPlaceholder(variable_name="messages")
]).partial(current_date=get_current_date, current_day=get_current_day)

# ==========================================
# Prompt Router
# ==========================================
PROMPTS = {
    "researcher": researcher_prompt,
    "summarizer": summarizer_prompt,
    "tutor": tutor_prompt
}

def get_prompt_for_persona(persona: str) -> ChatPromptTemplate:
    # Default to researcher if persona is unknown
    return PROMPTS.get(persona, PROMPTS["researcher"])
