from sqlalchemy.orm import Session

from app.models import AuditLog, User


def audit(db: Session, actor: User | None, action: str, entity_type: str, entity_id: str | None = None, message: str | None = None) -> None:
    db.add(AuditLog(actor_id=actor.id if actor else None, action=action, entity_type=entity_type, entity_id=entity_id, message=message))
