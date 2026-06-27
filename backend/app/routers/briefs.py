from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import ClientBrief, User
from app.db.session import get_db
from app.deps import get_current_user
from app.schemas import BriefCreate, BriefResponse, BriefUpdate, BriefValidationResponse
from app.services.audit import log_event


router = APIRouter(prefix="/briefs", tags=["briefs"])

REQUIRED_BRIEF_FIELDS = [
    "crop_type",
    "geography",
    "season",
    "acreage",
    "number_of_farmers",
    "trial_objective",
    "application_method",
    "duration_days",
]

AMBIGUOUS_MARKERS = {"tbd", "na", "n/a", "unknown", "to be decided"}
AMBIGUITY_CHECK_FIELDS = REQUIRED_BRIEF_FIELDS + ["soil_issues", "commercial_notes"]


def _validate_brief_fields(brief: ClientBrief) -> tuple[list[str], list[str]]:
    missing_fields: list[str] = []
    ambiguous_fields: list[str] = []

    for field_name in REQUIRED_BRIEF_FIELDS:
        value = getattr(brief, field_name)
        if value in (None, ""):
            missing_fields.append(field_name)

    for field_name in AMBIGUITY_CHECK_FIELDS:
        value = getattr(brief, field_name)
        if isinstance(value, str) and value.strip().lower() in AMBIGUOUS_MARKERS:
            ambiguous_fields.append(field_name)

    return missing_fields, ambiguous_fields


@router.post("", response_model=BriefResponse)
def create_brief(payload: BriefCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    brief = ClientBrief(created_by=user.id, **payload.model_dump())
    db.add(brief)
    db.commit()
    db.refresh(brief)

    log_event(db, "brief_created", "client_brief", brief.id, user.id)
    return brief


@router.get("/{brief_id}", response_model=BriefResponse)
def get_brief(brief_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    brief = db.query(ClientBrief).filter(ClientBrief.id == brief_id).first()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")
    return brief


@router.put("/{brief_id}", response_model=BriefResponse)
def update_brief(
    brief_id: int,
    payload: BriefUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    brief = db.query(ClientBrief).filter(ClientBrief.id == brief_id).first()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(brief, key, value)

    db.commit()
    db.refresh(brief)
    log_event(db, "brief_updated", "client_brief", brief.id, user.id)
    return brief


@router.get("/{brief_id}/validation", response_model=BriefValidationResponse)
def validate_brief(brief_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    brief = db.query(ClientBrief).filter(ClientBrief.id == brief_id).first()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    missing_fields, ambiguous_fields = _validate_brief_fields(brief)
    return BriefValidationResponse(
        brief_id=brief.id,
        missing_fields=missing_fields,
        ambiguous_fields=ambiguous_fields,
        is_ready_for_proposal=not missing_fields and not ambiguous_fields,
    )


@router.get("", response_model=list[BriefResponse])
def list_briefs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(ClientBrief).order_by(ClientBrief.created_at.desc()).all()
