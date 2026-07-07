from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Project, User, UserRole
from app.schemas import ProjectCreate, ProjectDetailOut, ProjectOut
from app.services.audit_service import audit

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.execute(select(Project).order_by(Project.created_at.desc())).scalars().all()


@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE))):
    existing = db.execute(select(Project).where(Project.project_code == payload.project_code)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Project code already exists")
    project = Project(**payload.model_dump())
    db.add(project)
    db.flush()
    audit(db, current_user, "PROJECT_CREATED", "Project", project.id, project.project_code)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/by-id/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"ok": True}

@router.get("/{project_id}", response_model=ProjectDetailOut)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.execute(
        select(Project)
        .options(selectinload(Project.expected_items), selectinload(Project.boxes))
        .where(Project.id == project_id)
    ).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


