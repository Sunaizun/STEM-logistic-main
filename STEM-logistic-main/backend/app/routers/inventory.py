from fastapi import APIRouter, Depends, HTTPException, Response
from openpyxl import Workbook
from io import BytesIO
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_roles
from app.models import Box, BoxEvent, BoxEventType, BoxStatus, InventoryScan, InventoryScanResult, InventorySession, InventoryStatus, User, UserRole, utc_now
from app.schemas import InventoryCreate, InventoryScanIn, InventoryScanOut, InventorySessionOut, InventorySummaryOut
from app.services.audit_service import audit

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("", response_model=InventorySessionOut)
def start_inventory(payload: InventoryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.PN))):
    session = InventorySession(warehouse=payload.warehouse, started_by_id=current_user.id)
    db.add(session)
    db.flush()
    audit(db, current_user, "INVENTORY_STARTED", "InventorySession", session.id, payload.warehouse.value)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=list[InventorySessionOut])
def list_inventory(db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.PN))):
    return db.execute(select(InventorySession).order_by(InventorySession.started_at.desc())).scalars().all()


@router.post("/{session_id}/scan", response_model=InventoryScanOut)
def scan_inventory(session_id: str, payload: InventoryScanIn, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.PN))):
    session = db.get(InventorySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Inventory session not found")
    if session.status != InventoryStatus.OPEN:
        raise HTTPException(status_code=400, detail="Inventory session is not open")

    code = payload.code.strip()
    box = db.execute(select(Box).where(Box.box_code == code)).scalar_one_or_none()
    result = InventoryScanResult.UNKNOWN
    if box:
        result = InventoryScanResult.FOUND if box.warehouse == session.warehouse and box.status in {BoxStatus.CREATED, BoxStatus.IN_WAREHOUSE} else InventoryScanResult.EXTRA
    scan = InventoryScan(session_id=session.id, box_id=box.id if box else None, scanned_code=code, result=result, scanned_by_id=current_user.id)
    db.add(scan)
    if box and result == InventoryScanResult.FOUND:
        db.add(BoxEvent(box_id=box.id, event_type=BoxEventType.INVENTORY_FOUND, actor_id=current_user.id, location=session.warehouse.value, comment=f"Ревизия {session.id}"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.execute(select(InventoryScan).where(InventoryScan.session_id == session.id, InventoryScan.scanned_code == code)).scalar_one()
        existing.result = InventoryScanResult.DUPLICATE
        db.commit()
        return existing
    db.refresh(scan)
    return scan


@router.get("/{session_id}", response_model=InventorySummaryOut)
def inventory_summary(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.PN))):
    session = db.get(InventorySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Inventory session not found")
    expected_boxes = db.execute(select(Box).options(selectinload(Box.contents)).where(Box.warehouse == session.warehouse, Box.status.in_([BoxStatus.CREATED, BoxStatus.IN_WAREHOUSE]))).scalars().all()
    scans = db.execute(select(InventoryScan).where(InventoryScan.session_id == session.id)).scalars().all()
    found_ids = {s.box_id for s in scans if s.box_id and s.result == InventoryScanResult.FOUND}
    missing = [b for b in expected_boxes if b.id not in found_ids]
    extra = [s for s in scans if s.result in {InventoryScanResult.EXTRA, InventoryScanResult.UNKNOWN}]
    return InventorySummaryOut(
        session=session,
        expected_total=len(expected_boxes),
        scanned_total=len(scans),
        found_total=len(found_ids),
        missing_boxes=missing,
        extra_scans=extra,
    )


@router.post("/{session_id}/finish", response_model=InventorySummaryOut)
def finish_inventory(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PN))):
    session = db.get(InventorySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Inventory session not found")
    session.status = InventoryStatus.FINISHED
    session.finished_at = utc_now()
    audit(db, current_user, "INVENTORY_FINISHED", "InventorySession", session.id, session.warehouse.value)
    db.commit()
    return inventory_summary(session_id, db, current_user)


@router.get("/{session_id}/report.xlsx")
def inventory_report(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PN))):
    summary = inventory_summary(session_id, db, current_user)
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventory report"
    ws.append(["Warehouse", summary.session.warehouse.value])
    ws.append(["Expected", summary.expected_total, "Scanned", summary.scanned_total, "Found", summary.found_total])
    ws.append([])
    ws.append(["Missing boxes"])
    ws.append(["Box code", "Project", "Label", "Status", "Location"])
    for box in summary.missing_boxes:
        ws.append([box.box_code, box.project.project_code if box.project else "", box.label_text, box.status.value, box.current_location])
    ws.append([])
    ws.append(["Extra/unknown scans"])
    ws.append(["Scanned code", "Result", "Time"])
    for scan in summary.extra_scans:
        ws.append([scan.scanned_code, scan.result.value, scan.scanned_at.isoformat()])
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=inventory-{session_id}.xlsx"})
