from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_roles
from app.models import Box, BoxEvent, BoxEventType, BoxStatus, User, UserRole
from app.schemas import BoxScanIn, BoxScanOut
from app.services.audit_service import audit

router = APIRouter(prefix="/scan", tags=["scan"])

ALLOWED_ACTIONS: dict[UserRole, set[BoxEventType]] = {
    UserRole.ADMIN: {BoxEventType.WAREHOUSE_IN, BoxEventType.WAREHOUSE_OUT, BoxEventType.DELIVERED},
    UserRole.MANAGER: {BoxEventType.WAREHOUSE_IN, BoxEventType.WAREHOUSE_OUT, BoxEventType.DELIVERED},
    UserRole.WAREHOUSE: {BoxEventType.WAREHOUSE_IN, BoxEventType.WAREHOUSE_OUT},
    UserRole.PN: {BoxEventType.WAREHOUSE_IN, BoxEventType.DELIVERED},
}


@router.post("/box", response_model=BoxScanOut)
def scan_box(
    payload: BoxScanIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.PN)),
):
    if payload.event_type not in ALLOWED_ACTIONS.get(current_user.role, set()):
        raise HTTPException(status_code=403, detail="Ваша роль не позволяет выполнить это действие")

    code = payload.box_code.strip()
    box = db.execute(select(Box).options(selectinload(Box.contents)).where(Box.box_code == code)).scalar_one_or_none()
    if not box:
        return BoxScanOut(success=False, message=f"Коробка {code} не найдена", box=None, event=None)

    if payload.event_type == BoxEventType.WAREHOUSE_IN and box.status == BoxStatus.IN_WAREHOUSE:
        raise HTTPException(status_code=400, detail="Коробка уже на складе")
    if payload.event_type == BoxEventType.WAREHOUSE_OUT and box.status == BoxStatus.SHIPPED:
        raise HTTPException(status_code=400, detail="Коробка уже отгружена")
    if payload.event_type == BoxEventType.DELIVERED and box.status == BoxStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Коробка уже доставлена")

    event = BoxEvent(box_id=box.id, event_type=payload.event_type, location=payload.location, comment=payload.comment, actor_id=current_user.id)
    db.add(event)
    if payload.event_type == BoxEventType.WAREHOUSE_IN:
        box.status = BoxStatus.IN_WAREHOUSE
        box.current_location = payload.location or box.current_location
        if current_user.warehouse:
            box.warehouse = current_user.warehouse
    elif payload.event_type == BoxEventType.WAREHOUSE_OUT:
        box.status = BoxStatus.SHIPPED
        box.current_location = payload.location or box.current_location
    elif payload.event_type == BoxEventType.DELIVERED:
        box.status = BoxStatus.DELIVERED
        box.current_location = payload.location or box.current_location
    audit(db, current_user, "BOX_SCANNED", "Box", box.id, f"{payload.event_type.value} {payload.location or ''}")
    db.commit()
    db.refresh(event)
    db.refresh(box)
    return BoxScanOut(success=True, message=f"{box.box_code}: {payload.event_type.value}", box=box, event=event)