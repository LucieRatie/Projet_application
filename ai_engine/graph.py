from langgraph.graph import StateGraph, END, START
from ai_engine.schemas import AgentState
from ai_engine.nodes import rag_node, evaluate_node, summary_node

workflow = StateGraph(AgentState)

workflow.add_node("RAG_Node", rag_node)
workflow.add_node("Evaluate_Node", evaluate_node)
workflow.add_node("Summary_Node", summary_node)


def route_entry(state: AgentState) -> str:
    """Routing à l'entrée : session normale ou fin de session."""
    if state.get('session_ended', False):
        return "Summary_Node"
    return "RAG_Node"


# Entrée conditionnelle : chaque appel invoke() est routé ici en premier
workflow.add_conditional_edges(START, route_entry, {
    "RAG_Node": "RAG_Node",
    "Summary_Node": "Summary_Node"
})

# Flux normal : RAG répond → Llama évalue → fin du tour
workflow.add_edge("RAG_Node", "Evaluate_Node")
workflow.add_edge("Evaluate_Node", END)

# Fin de session : Llama génère le rapport → fin
workflow.add_edge("Summary_Node", END)

ai_app = workflow.compile()


# =========================================================================
# SCRIPT DE TEST EN LOCAL
# Simule 2 questions de l'élève puis une fin de session
# =========================================================================
if __name__ == "__main__":
    # État initial partagé entre tous les tours
    state = {
        "student_id": "allophone_insa_01",
        "french_level": "A2",
        "session_ended": False,
        "student_question": "",
        "tutor_answer": "",
        "conversation_history": [],
        "evaluations_history": [],
        "final_report": ""
    }

    # --- Tour 1 ---
    state['student_question'] = input("\n[Tour 1] Question de l'élève : ")
    state = ai_app.invoke(state)

    print("\n--- RÉPONSE DU TUTEUR (QWEN) ---")
    print(state['tutor_answer'])
    print("\n--- FICHE D'ANALYSE (LLAMA PROF) ---")
    print(state['evaluations_history'][-1].model_dump_json(indent=2))

    # --- Tour 2 ---
    state['student_question'] = input("\n[Tour 2] Question de l'élève : ")
    state = ai_app.invoke(state)

    print("\n--- RÉPONSE DU TUTEUR (QWEN) ---")
    print(state['tutor_answer'])
    print("\n--- FICHE D'ANALYSE (LLAMA PROF) ---")
    print(state['evaluations_history'][-1].model_dump_json(indent=2))

    # --- Fin de session ---
    input("\n[Appuyez sur Entrée pour terminer la session...]")
    state['session_ended'] = True
    state = ai_app.invoke(state)

    print("\n=========================================")
    print("--- RAPPORT PÉDAGOGIQUE FINAL ---")
    print(state['final_report'])
    print("=========================================")
