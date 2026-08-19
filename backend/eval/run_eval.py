import os
import json
import pandas as pd
from dotenv import load_dotenv
from datasets import Dataset

# Langchain / Ragas imports
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from ragas import evaluate
from ragas.metrics import ContextPrecision, ContextRecall, Faithfulness, AnswerRelevancy

# Import our backend services
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.services.embedding_service import search_knowledge_base


load_dotenv()

def run_evaluation():
    print("Loading golden dataset...")
    with open("eval/golden_dataset.json", "r") as f:
        golden_data = json.load(f)

    # We will use OpenRouter for free open-source models as the evaluator "Judge"
    # To use a specific model like Llama-3-70b (which is good for judging), specify it.
    # Make sure you have OPENROUTER_API_KEY in your .env
    evaluator_llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY"),
        model="openrouter/free", # We're using a free model as requested!
        temperature=0
    )
    
    # Ragas also requires an embedding model to calculate answer relevancy
    evaluator_embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    eval_dataset = {
        "question": [],
        "answer": [],
        "contexts": [],
        "ground_truth": []
    }

    print("Running queries through Hybrid Search pipeline...")
    for item in golden_data:
        question = item["question"]
        print(f"Querying: {question}")
        
        # 1. Retrieve contexts using our Phase 2 Hybrid + Reranker pipeline
        retrieved_docs = search_knowledge_base(question, top_k=3)
        contexts = [doc["content"] for doc in retrieved_docs]
        
        # 2. Generate answer (simplified generation just for eval using the same open-source model)
        prompt = f"Answer the question based strictly on the context.\n\nContext: {contexts}\n\nQuestion: {question}"
        answer_msg = evaluator_llm.invoke(prompt)
        answer = answer_msg.content
        
        eval_dataset["question"].append(question)
        eval_dataset["answer"].append(answer)
        eval_dataset["contexts"].append(contexts)
        eval_dataset["ground_truth"].append(item["ground_truth"])

    # Convert to HuggingFace Dataset
    hf_dataset = Dataset.from_dict(eval_dataset)

    print("\nStarting Ragas Evaluation...")
    # NOTE: Smaller free models might struggle to output perfect JSON for some Ragas metrics. 
    # If faithfulness fails to parse, consider upgrading the evaluator_llm model to a 70B model.
    result = evaluate(
        dataset=hf_dataset,
        metrics=[
            ContextPrecision(),
            ContextRecall(),
            Faithfulness(),
            AnswerRelevancy()
        ],
        llm=evaluator_llm,
        embeddings=evaluator_embeddings
    )

    print("\n=== Evaluation Results ===")
    print(result)

    # Save to CSV
    df = result.to_pandas()
    df.to_csv("eval/evaluation_results.csv", index=False)
    print("\nDetailed results saved to eval/evaluation_results.csv")

if __name__ == "__main__":
    run_evaluation()
