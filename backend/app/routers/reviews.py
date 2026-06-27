from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Proposal, Review, User
from app.db.session import get_db
from app.deps import require_role
from app.schemas import ReviewCreate, ReviewResponse
from app.services.audit import log_event


router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("")
def submit_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_role({"reviewer", "admin"})),
):
    proposal = db.query(Proposal).filter(Proposal.id == payload.proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    review = Review(
        proposal_id=proposal.id,
        reviewer_id=reviewer.id,
        decision=payload.decision,
        comments=payload.comments,
    )
    db.add(review)
    proposal.status = "approved" if payload.decision == "approved" else "rejected"
    db.commit()

    log_event(db, "review_submitted", "proposal", proposal.id, reviewer.id, {"decision": payload.decision})
    return {"review_id": review.id, "proposal_status": proposal.status}


@router.get("/proposal/{proposal_id}", response_model=list[ReviewResponse])
def list_reviews(
    proposal_id: int,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_role({"reviewer", "admin"})),
):
    return (
        db.query(Review)
        .filter(Review.proposal_id == proposal_id)
        .order_by(Review.created_at.desc())
        .all()
    )
