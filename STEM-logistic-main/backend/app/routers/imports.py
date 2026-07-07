from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import User, UserRole
from app.schemas import ImportBatchOut, ImportConfirmOut
from app.services.import_service import confirm_import_batch, create_import_batch

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/1c-excel", response_model=ImportBatchOut)
async def upload_1c_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)),
):
    content = await file.read()
    return create_import_batch(db, current_user, file.filename or "1c.xlsx", content)


@router.post("/{batch_id}/confirm", response_model=ImportConfirmOut)
def confirm_import(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)),
):
    batch, projects_created, items_created, items_skipped = confirm_import_batch(db, current_user, batch_id)
    return ImportConfirmOut(
        batch=batch,
        projects_created=projects_created,
        expected_items_created=items_created,
        expected_items_skipped=items_skipped,
    )
