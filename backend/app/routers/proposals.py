from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.workflow import run_agent_workflow
from app.db.models import ClientBrief, Proposal, User
from app.db.session import get_db
from app.deps import get_current_user
from app.schemas import ProposalCreate, ProposalResponse
from app.services.audit import log_event


router = APIRouter(prefix="/proposals", tags=["proposals"])


def _serialize_proposal(proposal: Proposal) -> ProposalResponse:
    return ProposalResponse(
        id=proposal.id,
        brief_id=proposal.brief_id,
        content=proposal.content,
        citations=proposal.citations,
        governance_flags=proposal.governance_flags,
        status=proposal.status,
        trace_id=proposal.trace_id or None,
        model_route=proposal.model_route or None,
    )


@router.post("", response_model=ProposalResponse)
def generate_proposal(payload: ProposalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    brief = db.query(ClientBrief).filter(ClientBrief.id == payload.brief_id).first()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    result = run_agent_workflow(
        {
            "crop_type": brief.crop_type,
            "geography": brief.geography,
            "season": brief.season,
            "acreage": brief.acreage,
            "number_of_farmers": brief.number_of_farmers,
            "soil_issues": brief.soil_issues,
            "trial_objective": brief.trial_objective,
            "application_method": brief.application_method,
            "duration_days": brief.duration_days,
            "pricing_inputs": brief.pricing_inputs,
            "commercial_notes": brief.commercial_notes,
        },
        execution_context={
            "brief_id": brief.id,
            "user_id": user.id,
            "actor_role": user.role.name if user.role else "unknown",
        },
    )

    proposal = Proposal(
        brief_id=brief.id,
        content=str(result.proposal),
        citations=result.sources,
        governance_flags=result.governance_flags,
        trace_id=result.workflow_metadata.get("trace_id", ""),
        model_route=result.workflow_metadata.get("model_route", {}),
        status="pending_review",
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    workflow_payload = {
        "trace_id": result.workflow_metadata.get("trace_id", ""),
        "model_route": result.workflow_metadata.get("model_route", {}),
    }
    log_event(db, "proposal_generated", "proposal", proposal.id, user.id, payload=workflow_payload)
    serialized = _serialize_proposal(proposal)
    if not serialized.trace_id:
        serialized.trace_id = workflow_payload["trace_id"] or None
    if not serialized.model_route:
        serialized.model_route = workflow_payload["model_route"] or None
    return serialized


@router.get("/{proposal_id}", response_model=ProposalResponse)
def get_proposal(proposal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return _serialize_proposal(proposal)


@router.get("", response_model=list[ProposalResponse])
def list_proposals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    proposals = db.query(Proposal).order_by(Proposal.created_at.desc()).all()
    return [_serialize_proposal(proposal) for proposal in proposals]


@router.get("/{proposal_id}/citations", response_model=list[dict])
def get_proposal_citations(
    proposal_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal.citations
