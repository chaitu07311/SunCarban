import time
from dataclasses import dataclass, field
from typing import Any, Callable, TypedDict
from uuid import uuid4

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
    workflow_metadata: dict = field(default_factory=dict)


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
    workflow_metadata: dict[str, Any]


class _WorkflowTracer:
    def __init__(self, brief: dict[str, Any], execution_context: dict[str, Any] | None = None) -> None:
        self.trace_id = f"trace_{uuid4().hex}"
        self._brief = brief
        self._execution_context = execution_context or {}
        self._langfuse = None
        self._trace = None
        self._spans: dict[str, Any] = {}

        if not settings.enable_langfuse:
            return

        if not settings.langfuse_public_key or not settings.langfuse_secret_key:
            return

        try:
            from langfuse import Langfuse

            self._langfuse = Langfuse(
                public_key=settings.langfuse_public_key,
                secret_key=settings.langfuse_secret_key,
                host=settings.langfuse_host,
            )
            self._trace = self._langfuse.trace(
                id=self.trace_id,
                name="proposal_generation",
                input=self._brief,
                metadata=self._execution_context,
            )
        except Exception:
            self._langfuse = None
            self._trace = None

    def start_span(self, name: str, payload: dict[str, Any]) -> None:
        if not self._trace:
            return
        try:
            self._spans[name] = self._trace.span(name=name, input=payload)
        except Exception:
            self._spans.pop(name, None)

    def end_span(self, name: str, output_payload: dict[str, Any], metadata: dict[str, Any] | None = None) -> None:
        span = self._spans.pop(name, None)
        if not span:
            return
        try:
            span.end(output=output_payload, metadata=metadata or {})
        except Exception:
            pass

    def end_trace(self, output_payload: dict[str, Any], metadata: dict[str, Any]) -> None:
        if self._trace:
            try:
                self._trace.update(output=output_payload, metadata=metadata)
            except Exception:
                pass
        if self._langfuse:
            try:
                self._langfuse.flush()
            except Exception:
                pass


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
        "workflow_metadata": {},
    }


def _avg_confidence(recommendations: list[dict[str, Any]]) -> float:
    if not recommendations:
        return 0.0
    values = [float(rec.get("confidence", 0.0)) for rec in recommendations]
    return round(sum(values) / len(values), 2)


def _brief_complexity_score(brief: dict[str, Any], missing_fields: list[str]) -> float:
    acreage = float(brief.get("acreage") or 0)
    farmers = float(brief.get("number_of_farmers") or 0)
    has_pricing = 0.0 if brief.get("pricing_inputs") in ({}, None) else 1.0
    has_soil_context = 1.0 if str(brief.get("soil_issues") or "").strip() else 0.0
    missing_penalty = min(1.0, len(missing_fields) / max(len(REQUIRED_FIELDS), 1))

    # Weighted heuristic that keeps score in [0, 1].
    score = (
        min(acreage / 300.0, 1.0) * 0.25
        + min(farmers / 100.0, 1.0) * 0.20
        + has_pricing * 0.15
        + has_soil_context * 0.10
        + (1.0 - missing_penalty) * 0.30
    )
    return round(min(max(score, 0.0), 1.0), 2)


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


def _router_node(state: WorkflowState) -> WorkflowState:
    complexity = _brief_complexity_score(state["brief"], state["missing_fields"])
    confidence = _avg_confidence(state["recommendations"])

    route = {
        "router_enabled": settings.route_model_router_enabled,
        "complexity_score": complexity,
        "retrieval_confidence": confidence,
        "initial_model": settings.route_model_lite_name,
        "selected_model": settings.route_model_lite_name,
        "cascade_applied": False,
        "route_reason": "default_lite",
    }

    if settings.route_model_router_enabled and (
        complexity >= settings.route_model_complexity_threshold
        or confidence < settings.route_model_confidence_threshold
    ):
        route["selected_model"] = settings.route_model_strong_name
        route["route_reason"] = "complex_or_low_confidence"

    state["workflow_metadata"]["model_route"] = route
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
        "generation_metadata": {
            "selected_model": state["workflow_metadata"].get("model_route", {}).get("selected_model", settings.route_model_lite_name),
            "trace_id": state["workflow_metadata"].get("trace_id", ""),
        },
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

    if not governance_flags:
        governance_flags.append("No blocking governance issues detected")

    state["governance_flags"] = governance_flags
    return state


def _cascade_node(state: WorkflowState) -> WorkflowState:
    route = state["workflow_metadata"].get("model_route", {})
    if not route:
        return state

    if not settings.route_model_cascade_enabled:
        route["cascade_reason"] = "cascade_disabled"
        state["workflow_metadata"]["model_route"] = route
        return state

    selected_model = route.get("selected_model")
    if selected_model == settings.route_model_strong_name:
        route["cascade_reason"] = "already_strong"
        state["workflow_metadata"]["model_route"] = route
        return state

    retrieval_confidence = float(route.get("retrieval_confidence", 0.0))
    should_escalate = (
        retrieval_confidence < settings.route_model_confidence_threshold
        or len(state["governance_flags"]) > 0
    )

    if should_escalate:
        route["cascade_applied"] = True
        route["selected_model"] = settings.route_model_strong_name
        route["cascade_reason"] = "low_confidence_or_governance_flags"
    else:
        route["cascade_reason"] = "not_required"

    state["workflow_metadata"]["model_route"] = route
    return state


def _execute_node(
    state: WorkflowState,
    node_name: str,
    node_fn: Callable[[WorkflowState], WorkflowState],
    tracer: _WorkflowTracer,
) -> WorkflowState:
    started = time.perf_counter()
    tracer.start_span(node_name, {"trace_id": tracer.trace_id})

    try:
        updated_state = node_fn(state)
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        tracer.end_span(
            node_name,
            {"status": "error", "error": str(exc)},
            metadata={"latency_ms": elapsed_ms},
        )
        raise

    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    tracer.end_span(
        node_name,
        {
            "status": "ok",
            "governance_flags": updated_state.get("governance_flags", []),
            "missing_fields": updated_state.get("missing_fields", []),
        },
        metadata={"latency_ms": elapsed_ms},
    )
    return updated_state


def _run_linear_workflow(brief: dict[str, Any], tracer: _WorkflowTracer) -> WorkflowState:
    state = _build_initial_state(brief)
    state["workflow_metadata"]["trace_id"] = tracer.trace_id
    state = _execute_node(state, "analyzer", _analyzer_node, tracer)
    state = _execute_node(state, "retriever", _retriever_node, tracer)
    state = _execute_node(state, "router", _router_node, tracer)
    state = _execute_node(state, "drafter", _drafter_node, tracer)
    state = _execute_node(state, "governance", _governance_node, tracer)
    state = _execute_node(state, "cascade", _cascade_node, tracer)
    return state


def _run_langgraph_workflow(brief: dict[str, Any], tracer: _WorkflowTracer) -> WorkflowState:
    try:
        from langgraph.graph import END, START, StateGraph
    except Exception:
        return _run_linear_workflow(brief, tracer)

    graph = StateGraph(WorkflowState)
    graph.add_node("analyzer", lambda s: _execute_node(s, "analyzer", _analyzer_node, tracer))
    graph.add_node("retriever", lambda s: _execute_node(s, "retriever", _retriever_node, tracer))
    graph.add_node("router", lambda s: _execute_node(s, "router", _router_node, tracer))
    graph.add_node("drafter", lambda s: _execute_node(s, "drafter", _drafter_node, tracer))
    graph.add_node("governance", lambda s: _execute_node(s, "governance", _governance_node, tracer))
    graph.add_node("cascade", lambda s: _execute_node(s, "cascade", _cascade_node, tracer))

    graph.add_edge(START, "analyzer")
    graph.add_edge("analyzer", "retriever")
    graph.add_edge("retriever", "router")
    graph.add_edge("router", "drafter")
    graph.add_edge("drafter", "governance")
    graph.add_edge("governance", "cascade")
    graph.add_edge("cascade", END)

    compiled = graph.compile()
    try:
        initial_state = _build_initial_state(brief)
        initial_state["workflow_metadata"]["trace_id"] = tracer.trace_id
        return compiled.invoke(initial_state)
    except Exception:
        return _run_linear_workflow(brief, tracer)


def run_agent_workflow(brief: dict[str, Any], execution_context: dict[str, Any] | None = None) -> AgentResult:
    tracer = _WorkflowTracer(brief, execution_context=execution_context)
    state = _run_langgraph_workflow(brief, tracer) if settings.enable_langgraph else _run_linear_workflow(brief, tracer)
    tracer.end_trace(
        {
            "governance_flags": state["governance_flags"],
            "review_flags": state["review_flags"],
            "model_route": state["workflow_metadata"].get("model_route", {}),
        },
        metadata={
            "trace_id": tracer.trace_id,
            "brief_id": (execution_context or {}).get("brief_id"),
            "user_id": (execution_context or {}).get("user_id"),
        },
    )

    return AgentResult(
        proposal_plan=state["proposal_plan"],
        missing_fields=state["missing_fields"],
        review_flags=state["review_flags"],
        recommendations=state["recommendations"],
        sources=state["sources"],
        proposal=state["proposal"],
        review_checklist=state["review_checklist"],
        governance_flags=state["governance_flags"],
        workflow_metadata=state["workflow_metadata"],
    )
