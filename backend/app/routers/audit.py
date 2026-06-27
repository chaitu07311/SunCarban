from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import AuditLog, User
from app.db.session import get_db
from app.deps import require_role
from app.schemas import AuditLogResponse


router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    db: Session = Depends(get_db),
    user: User = Depends(require_role({"admin", "reviewer"})),
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200).all()
