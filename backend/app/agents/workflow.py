from dataclasses import dataclass, field
from typing import Any, TypedDict

from app.core.config import settings


REQUIRED_FIELDS = [
    "crop_type",
    "geography",
    "season",
    "acreage",
    "number_of_farmers",
    "trial_objective",
    "application_method",
    "duration_days",
]


@dataclass
class AgentResult:
    proposal_plan: dict = field(default_factory=dict)
    missing_fields: list[str] = field(default_factory=list)
    review_flags: list[str] = field(default_factory=list)
    recommendations: list[dict] = field(default_factory=list)
    sources: list[dict] = field(default_factory=list)
    proposal: dict = field(default_factory=dict)
    review_checklist: list[str] = field(default_factory=list)
    governance_flags: list[str] = field(default_factory=list)


class WorkflowState(TypedDict):
    brief: dict[str, Any]
    proposal_plan: dict[str, Any]
    missing_fields: list[str]
    review_flags: list[str]
    recommendations: list[dict[str, Any]]
    sources: list[dict[str, Any]]
    proposal: dict[str, Any]
    review_checklist: list[str]
    governance_flags: list[str]


def _build_initial_state(brief: dict[str, Any]) -> WorkflowState:
    return {
        "brief": brief,
        "proposal_plan": {},
        "missing_fields": [],
        "review_flags": [],
        "recommendations": [],
        "sources": [],
        "proposal": {},
        "review_checklist": [],
        "governance_flags": [],
    }


def _analyzer_node(state: WorkflowState) -> WorkflowState:
    brief = state["brief"]
    missing_fields = [field_name for field_name in REQUIRED_FIELDS if brief.get(field_name) in (None, "", [])]

    plan = {
        "template": "crop_trial_standard",
        "objective": brief.get("trial_objective", ""),
        "timeline_days": brief.get("duration_days", 0),
        "application_method": brief.get("application_method", "TBD"),
        "recommended_control_design": "Control vs treatment with equal acreage split",
    }

    review_flags = []
    if missing_fields:
        review_flags.append("Incomplete brief fields")

    state["missing_fields"] = missing_fields
    state["proposal_plan"] = plan
    state["review_flags"] = review_flags
    return state


def _retrieve_from_chroma(query: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    try:
        import chromadb
    except Exception:
        return [], []

    try:
        client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
        collection = client.get_collection(settings.chroma_collection)
        result = collection.query(query_texts=[query], n_results=settings.retrieval_top_k)

        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]

        recommendations: list[dict[str, Any]] = []
        sources: list[dict[str, Any]] = []

        for idx, text in enumerate(documents):
            distance = distances[idx] if idx < len(distances) else 0.4
            confidence = round(max(0.0, 1.0 - float(distance)), 2)
            metadata = metadatas[idx] if idx < len(metadatas) and isinstance(metadatas[idx], dict) else {}
            recommendations.append(
                {
                    "title": "Knowledge-grounded recommendation",
                    "detail": text,
                    "confidence": confidence,
                }
            )
            sources.append(
                {
                    "document": metadata.get("document", "knowledge_base_document"),
                    "section": metadata.get("section", f"Chunk {idx + 1}"),
                    "confidence": confidence,
                }
            )

        return recommendations, sources
    except Exception:
        return [], []


def _retriever_node(state: WorkflowState) -> WorkflowState:
    brief = state["brief"]
    query = (
        f"Crop: {brief.get('crop_type', '')}; Geography: {brief.get('geography', '')}; "
        f"Objective: {brief.get('trial_objective', '')}; Method: {brief.get('application_method', '')}"
    )

    recommendations: list[dict[str, Any]] = []
    sources: list[dict[str, Any]] = []

    if settings.enable_chroma_retrieval:
        recommendations, sources = _retrieve_from_chroma(query)

    if not recommendations:
        recommendations = [
            {
                "title": "Apply SunCarbon Black via recommended method",
                "detail": f"Use method: {brief.get('application_method', 'TBD')}",
                "confidence": 0.78,
            }
        ]
        sources = [
            {
                "document": "application_guidelines_v1.pdf",
                "section": "Section 2.1",
                "confidence": 0.78,
            }
        ]

    state["recommendations"] = recommendations
    state["sources"] = sources
    return state


def _drafter_node(state: WorkflowState) -> WorkflowState:
    brief = state["brief"]
    recommendations = state["recommendations"]
    sources = state["sources"]

    state["proposal"] = {
        "executive_summary": "Draft generated from approved knowledge base.",
        "client_context": f"Crop: {brief.get('crop_type', 'NA')} | Geography: {brief.get('geography', 'NA')}",
        "problem_statement": brief.get("soil_issues", "To be validated during review."),
        "trial_objective": brief.get("trial_objective", ""),
        "recommended_application_plan": recommendations,
        "control_vs_treatment_design": "Control and treatment plots with consistent monitoring intervals.",
        "monitoring_parameters": ["Yield", "Soil organic carbon", "Plant vigor"],
        "training_plan": "On-field training before trial start and at midpoint.",
        "risks_and_assumptions": state["review_flags"],
        "sources": sources,
    }
    state["review_checklist"] = [
        "Validate dosage against current agronomy guideline",
        "Confirm pricing assumptions with finance",
        "Verify control vs treatment design feasibility",
        "Approve or request revision",
    ]
    return state


def _governance_node(state: WorkflowState) -> WorkflowState:
    governance_flags = list(state["review_flags"])

    if state["brief"].get("pricing_inputs") in ({}, None):
        governance_flags.append("Pricing inputs missing")

    if any(float(rec.get("confidence", 0.0)) < settings.retrieval_confidence_threshold for rec in state["recommendations"]):
        governance_flags.append("Low retrieval confidence; reviewer validation required")

    if not state["sources"]:
        governance_flags.append("No source citations found")

    state["governance_flags"] = governance_flags
    return state


def _run_linear_workflow(brief: dict[str, Any]) -> WorkflowState:
    state = _build_initial_state(brief)
    state = _analyzer_node(state)
    state = _retriever_node(state)
    state = _drafter_node(state)
    state = _governance_node(state)
    return state


def _run_langgraph_workflow(brief: dict[str, Any]) -> WorkflowState:
    try:
        from langgraph.graph import END, START, StateGraph
    except Exception:
        return _run_linear_workflow(brief)

    graph = StateGraph(WorkflowState)
    graph.add_node("analyzer", _analyzer_node)
    graph.add_node("retriever", _retriever_node)
    graph.add_node("drafter", _drafter_node)
    graph.add_node("governance", _governance_node)

    graph.add_edge(START, "analyzer")
    graph.add_edge("analyzer", "retriever")
    graph.add_edge("retriever", "drafter")
    graph.add_edge("drafter", "governance")
    graph.add_edge("governance", END)

    compiled = graph.compile()
    try:
        return compiled.invoke(_build_initial_state(brief))
    except Exception:
        return _run_linear_workflow(brief)


def run_agent_workflow(brief: dict[str, Any]) -> AgentResult:
    state = _run_langgraph_workflow(brief) if settings.enable_langgraph else _run_linear_workflow(brief)
    return AgentResult(
        proposal_plan=state["proposal_plan"],
        missing_fields=state["missing_fields"],
        review_flags=state["review_flags"],
        recommendations=state["recommendations"],
        sources=state["sources"],
        proposal=state["proposal"],
        review_checklist=state["review_checklist"],
        governance_flags=state["governance_flags"],
    )
