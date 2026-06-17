from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai_engine.graph import ai_app

app = FastAPI(title="AI Tutor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    thread_id: str
    student_id: str
    question: str
    french_level: str = "A2"
    session_ended: bool = False
    conversation_history: List[dict] = []
    evaluations_history: List[dict] = []


@app.post("/api/chat")
def chat_with_tutor(data: ChatRequest):
    initial_state = {
        "student_id": data.student_id,
        "french_level": data.french_level,
        "session_ended": data.session_ended,
        "student_question": data.question,
        "tutor_answer": "",
        "conversation_history": data.conversation_history,
        "evaluations_history": data.evaluations_history,
        "final_report": "",
    }

    final_state = ai_app.invoke(initial_state)

    evaluation = {}
    if final_state.get("evaluations_history"):
        last = final_state["evaluations_history"][-1]
        evaluation = last.model_dump() if hasattr(last, "model_dump") else last

    return {
        "tutor_answer": final_state.get("tutor_answer", ""),
        "final_report": final_state.get("final_report", ""),
        "evaluation": evaluation,
        "conversation_history": final_state.get("conversation_history", []),
        "evaluations_history": [
            e.model_dump() if hasattr(e, "model_dump") else e
            for e in final_state.get("evaluations_history", [])
        ],
    }
