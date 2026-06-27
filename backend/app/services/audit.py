from sqlalchemy.orm import Session

from app.db.models import AuditLog


def log_event(db: Session, action: str, entity_type: str, entity_id: int, actor_id: int | None, payload: dict | None = None) -> None:
    row = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        payload=payload or {},
    )
    db.add(row)
    db.commit()
