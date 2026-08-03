from pydantic import BaseModel, Field
from typing import List

# ==========================================
# Quiz Schemas
# ==========================================
class QuizQuestion(BaseModel):
    question: str = Field(description="The question being asked")
    options: List[str] = Field(description="A list of 4 possible options for the user to choose from")
    correct_answer: str = Field(description="The exact text of the correct option from the options list")
    explanation: str = Field(description="A brief explanation of why the answer is correct")

class Quiz(BaseModel):
    title: str = Field(description="A catchy title for the quiz")
    questions: List[QuizQuestion] = Field(description="A list of exactly 3 quiz questions based on the topic")

# ==========================================
# Flashcard Schemas
# ==========================================
class Flashcard(BaseModel):
    front: str = Field(description="The front of the flashcard, usually a term or a question")
    back: str = Field(description="The back of the flashcard, providing the definition or answer")

class FlashcardDeck(BaseModel):
    title: str = Field(description="A descriptive title for the flashcard deck")
    cards: List[Flashcard] = Field(description="A list of 3-5 flashcards summarizing key concepts")
