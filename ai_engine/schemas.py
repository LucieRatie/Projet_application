from typing import List, TypedDict
from pydantic import BaseModel, Field


class TourAnalysis(BaseModel):
    numero_tour: int = Field(default=1, description="Numéro du tour de conversation")
    erreur_langue: str = Field(description="Fautes de français dans la question de l'élève, ou 'Aucune'")
    erreur_math: str = Field(description="Incompréhensions ou erreurs mathématiques révélées par la question, ou 'Aucune'")
    comportement: str = Field(description="Observation comportementale : curiosité, frustration, progression, hésitation...")
    analyse_psychologique: str = Field(description="Analyse du niveau de confiance, de la motivation et des blocages de l'élève")
    niveau_comprehension: str = Field(description="Niveau de compréhension estimé : faible / moyen / bon")
    recommandation: str = Field(description="Recommandation pédagogique concrète pour la suite de la session")


class AgentState(TypedDict):
    student_id: str
    french_level: str
    session_ended: bool            # True quand l'élève clique "Fin de session" sur le Web
    student_question: str          # La question/doute posé par l'élève
    tutor_answer: str              # La réponse explicative générée par Qwen via le PDF
    conversation_history: List[dict]   # [{"student_question": ..., "tutor_answer": ...}, ...]
    evaluations_history: List[TourAnalysis]
    final_report: str
