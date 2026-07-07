import random

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Box, BoxContent, BoxEvent, BoxEventType, BoxStatus, Project, User, UserRole
from app.schemas import BoxCreate, BoxEventCreate, BoxEventOut, BoxOut, BoxUpdate
from app.services.audit_service import audit
from app.services.label_service import generate_box_label_pdf

router = APIRouter(prefix="/boxes", tags=["boxes"])
public_router = APIRouter(prefix="/public", tags=["public"])


def generate_box_code(db: Session) -> str:
    for _ in range(100):
        code = f"BX-{random.randint(1, 999999):06d}"
        exists = db.execute(select(Box).where(Box.box_code == code)).scalar_one_or_none()
        if not exists:
            return code
    raise HTTPException(status_code=500, detail="Cannot generate box code")


def get_box_by_code(db: Session, box_code: str) -> Box:
    box = db.execute(
        select(Box).options(selectinload(Box.contents), selectinload(Box.project)).where(Box.box_code == box_code.strip())
    ).scalar_one_or_none()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    return box


@router.post("", response_model=BoxOut)
def create_box(payload: BoxCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE))):
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    box = Box(
        box_code=generate_box_code(db),
        project_id=payload.project_id,
        label_text=payload.label_text,
        title=payload.title,
        box_number=payload.box_number,
        total_boxes=payload.total_boxes,
        warehouse=payload.warehouse,
        current_location=payload.current_location or (payload.warehouse.value if payload.warehouse else None),
        contents_text=payload.contents_text,
        comment=payload.comment,
        created_by_id=current_user.id,
    )
    db.add(box)
    db.flush()
    for content in payload.contents:
        db.add(BoxContent(box_id=box.id, **content.model_dump()))
    db.add(BoxEvent(box_id=box.id, event_type=BoxEventType.CREATED, actor_id=current_user.id, location=box.current_location, comment="Коробка создана"))
    audit(db, current_user, "BOX_CREATED", "Box", box.id, box.box_code)
    db.commit()
    db.refresh(box)
    return get_box_by_code(db, box.box_code)


@router.get("/{box_code}", response_model=BoxOut)
def get_box(box_code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_box_by_code(db, box_code)


@router.patch("/{box_code}", response_model=BoxOut)
def update_box(box_code: str, payload: BoxUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE))):
    box = get_box_by_code(db, box_code)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(box, key, value)
    db.add(BoxEvent(box_id=box.id, event_type=BoxEventType.UPDATED, actor_id=current_user.id, location=box.current_location, comment="Данные коробки обновлены"))
    audit(db, current_user, "BOX_UPDATED", "Box", box.id, box.box_code)
    db.commit()
    return get_box_by_code(db, box.box_code)


@router.post("/{box_code}/events", response_model=BoxEventOut)
def add_box_event(box_code: str, payload: BoxEventCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.PN))):
    box = get_box_by_code(db, box_code)
    event = BoxEvent(box_id=box.id, actor_id=current_user.id, **payload.model_dump())
    db.add(event)
    if payload.event_type == BoxEventType.WAREHOUSE_IN:
        box.status = BoxStatus.IN_WAREHOUSE
        box.current_location = payload.location
    elif payload.event_type == BoxEventType.WAREHOUSE_OUT:
        box.status = BoxStatus.SHIPPED
        box.current_location = payload.location
    elif payload.event_type == BoxEventType.DELIVERED:
        box.status = BoxStatus.DELIVERED
        box.current_location = payload.location
    audit(db, current_user, "BOX_EVENT", "Box", box.id, payload.event_type.value)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{box_code}/events", response_model=list[BoxEventOut])
def box_events(box_code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    box = get_box_by_code(db, box_code)
    events = db.execute(
        select(BoxEvent)
        .options(selectinload(BoxEvent.actor))
        .where(BoxEvent.box_id == box.id)
        .order_by(BoxEvent.created_at.desc())
    ).scalars().all()
    
    result = []
    for e in events:
        d = BoxEventOut(
            id=e.id,
            box_id=e.box_id,
            event_type=e.event_type,
            location=e.location,
            actor_id=e.actor_id,
            actor_name=e.actor.name if e.actor else None,
            comment=e.comment,
            created_at=e.created_at,
        )
        result.append(d)
    return result

@router.get("/{box_code}/label.pdf")
def box_label(box_code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    box = get_box_by_code(db, box_code)
    pdf = generate_box_label_pdf(box)
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={box.box_code}.pdf"})


@public_router.get("/boxes/{token}", response_model=BoxOut)
def public_box(token: str, db: Session = Depends(get_db)):
    box = db.execute(select(Box).options(selectinload(Box.contents), selectinload(Box.project)).where(Box.public_token == token)).scalar_one_or_none()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    return box

@router.get("/search/", response_model=list[BoxOut])
def search_boxes(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Поиск коробок по коду, названию проекта или содержимому"""
    boxes = db.execute(
        select(Box)
        .options(selectinload(Box.contents), selectinload(Box.project))
        .where(
            Box.box_code.ilike(f"%{q}%") |
            Box.label_text.ilike(f"%{q}%") |
            Box.title.ilike(f"%{q}%") |
            Box.contents_text.ilike(f"%{q}%") |
            Box.project.has(Project.project_code.ilike(f"%{q}%")) |
            Box.project.has(Project.name.ilike(f"%{q}%"))
        )
        .order_by(Box.updated_at.desc())
        .limit(50)
    ).scalars().all()
    return boxes

@router.get("/search/", response_model=list[BoxOut])
def search_boxes(q: str = "", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Поиск коробок по коду, названию проекта или содержимому"""
    query = db.query(Box).options(selectinload(Box.contents), selectinload(Box.project))
    if q:
        query = query.filter(
            Box.box_code.ilike(f"%{q}%") |
            Box.label_text.ilike(f"%{q}%") |
            Box.title.ilike(f"%{q}%") |
            Box.contents_text.ilike(f"%{q}%") |
            Box.project.has(Project.project_code.ilike(f"%{q}%")) |
            Box.project.has(Project.name.ilike(f"%{q}%"))
        )
    return query.order_by(Box.updated_at.desc()).limit(50).all()

@public_router.get("/boxes/{token}/label.pdf")
def public_box_label(token: str, db: Session = Depends(get_db)):
    box = db.execute(select(Box).where(Box.public_token == token)).scalar_one_or_none()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    pdf = generate_box_label_pdf(box)
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={box.box_code}.pdf"})

@router.get("/search/", response_model=list[BoxOut])
def search_boxes(q: str = "", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Поиск коробок. Складовщик видит только свой склад."""
    query = db.query(Box).options(selectinload(Box.contents), selectinload(Box.project))
    
    # Складовщик видит только свои коробки
    if current_user.role == UserRole.WAREHOUSE and current_user.warehouse:
        query = query.filter(Box.warehouse == current_user.warehouse)
    
    if q:
        query = query.filter(
            Box.box_code.ilike(f"%{q}%") |
            Box.label_text.ilike(f"%{q}%") |
            Box.title.ilike(f"%{q}%") |
            Box.contents_text.ilike(f"%{q}%") |
            Box.project.has(Project.project_code.ilike(f"%{q}%")) |
            Box.project.has(Project.name.ilike(f"%{q}%"))
        )
    return query.order_by(Box.updated_at.desc()).limit(50).all()

@router.delete("/{box_code}")
def delete_box(box_code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    box = db.execute(select(Box).where(Box.box_code == box_code.strip())).scalar_one_or_none()
    if not box:
        raise HTTPException(status_code=404, detail="Box not found")
    # Только создатель или админ может удалить
    if current_user.role != UserRole.ADMIN and box.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(box)
    db.commit()
    return {"ok": True}
