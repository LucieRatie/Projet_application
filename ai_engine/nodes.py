from ai_engine.config import llm_qwen_student, llm_llama_prof
from ai_engine.schemas import AgentState, TourAnalysis
from ai_engine.rag_service import retrieve_math_concept

#Definir le form retourne de IA prof
structured_llama_prof = llm_llama_prof.with_structured_output(TourAnalysis)


def rag_node(state: AgentState):
    """Recoit la question de l'eleve, interroge le PDF, Qwen genere une explication pedagogique."""
    print("\n[NODE] -> RAG Node: recherche PDF + réponse pédagogique via Qwen...")

    context = retrieve_math_concept(state['student_question'])

    prompt = f"""Tu es un tuteur de mathématiques bienveillant et pédagogue.Un élève de niveau français {state['french_level']} te pose cette question : « {state['student_question']} »
        Voici les extraits du manuel scolaire pertinents pour répondre : --- {context} ---
        Réponds à l'élève en français clair et adapté à son niveau.
        Explique le concept étape par étape en t'appuyant sur le manuel.
        Ne donne pas directement la réponse finale si c'est un exercice — guide l'élève."""

    response = llm_qwen_student.invoke(prompt)
    return {"tutor_answer": response.content}


def evaluate_node(state: AgentState):
    """Reçoit le tour de conversation complet et analyse le comportement et les erreurs de l'élève."""
    print("\n[NODE] -> Evaluate Node: analyse comportementale et pédagogique via Llama Prof...")

    num_tour = len(state['evaluations_history']) + 1
    history = state.get('conversation_history', [])
    history_str = ""
    if history:
        for i, turn in enumerate(history, start=1):
            history_str += (
                f"[Tour {i}]\n"
                f"Élève : {turn['student_question']}\n"
                f"Tuteur : {turn['tutor_answer']}\n\n"
            )
    else:
        history_str = "Aucun échange précédent — premier tour de la session."

    prompt = f"""Tu es un professeur expert en pédagogie et en psychologie de l'apprentissage.
        === HISTORIQUE DE LA SESSION ===
        {history_str}
        === ÉCHANGE ACTUEL (Tour {num_tour}) ===
        Élève : {state['student_question']}
        Tuteur : {state['tutor_answer']}
        Analyse cet échange en te basant sur TOUT l'historique de la session :
        1. ERREURS DE LANGUE : relève les fautes d'orthographe, de grammaire ou de syntaxe dans la formulation de la question de l'élève.
        2. ERREURS MATHÉMATIQUES : identifie les incompréhensions conceptuelles ou les erreurs de logique révélées par la façon dont l'élève formule sa question.
        3. COMPORTEMENT : décris le comportement observable (curiosité, frustration, progrès, hésitation, répétition d'erreurs...).
        4. ANALYSE PSYCHOLOGIQUE : évalue le niveau de confiance, la motivation et les éventuels blocages affectifs ou cognitifs.
        5. NIVEAU DE COMPRÉHENSION : estime le niveau global (faible / moyen / bon) en comparant avec les tours précédents.
        6. RECOMMANDATION : propose une action pédagogique concrète pour le prochain tour."""

    analysis = structured_llama_prof.invoke(prompt)
    analysis.numero_tour = num_tour

    new_turn = {
        "student_question": state['student_question'],
        "tutor_answer": state['tutor_answer']
    }
    updated_history = list(state.get('conversation_history', []))
    updated_history.append(new_turn)

    updated_evaluations = list(state['evaluations_history'])
    updated_evaluations.append(analysis)

    return {
        "evaluations_history": updated_evaluations,
        "conversation_history": updated_history
    }


def summary_node(state: AgentState):
    """Declenche par 'fin de session' — agrege toutes les fiches llama en rapport final."""
    print("\n[NODE] -> Summary Node: génération du rapport de fin de session via Llama...")

    conv_str = ""
    for i, turn in enumerate(state.get('conversation_history', []), start=1):
        conv_str += f"[Tour {i}] Élève : {turn['student_question']}\n"
        conv_str += f"           Tuteur : {turn['tutor_answer']}\n\n"

    fiches_str = ""
    for ev in state['evaluations_history']:
        fiches_str += (
            f"--- Fiche Tour {ev.numero_tour} ---\n"
            f"Erreur langue    : {ev.erreur_langue}\n"
            f"Erreur math      : {ev.erreur_math}\n"
            f"Comportement     : {ev.comportement}\n"
            f"Psychologie      : {ev.analyse_psychologique}\n"
            f"Compréhension    : {ev.niveau_comprehension}\n"
            f"Recommandation   : {ev.recommandation}\n\n"
        )

    prompt = f"""Tu es un professeur de mathématiques. Rédige un rapport pédagogique de fin de session en français.
        === ÉCHANGES COMPLETS DE LA SESSION ===
        {conv_str}
        === FICHES D'ANALYSE PAR TOUR ===
        {fiches_str}
        Le rapport doit être structuré ainsi :
        1. Résumé de la session (thèmes abordés, nombre de questions)
        2. Points forts observés chez l'élève
        3. Erreurs récurrentes (langue et mathématiques)
        4. Profil comportemental et psychologique de l'élève
        5. Recommandations pédagogiques personnalisées pour la prochaine session
        6. Évaluation globale de la session"""

    response = llm_llama_prof.invoke(prompt)
    return {"final_report": response.content}
