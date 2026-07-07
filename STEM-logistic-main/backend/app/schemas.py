from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.models import (
    BoxEventType, BoxStatus, ImportStatus, InventoryScanResult,
    InventoryStatus, ProjectStatus, UserRole, WarehouseCode,
)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole
    warehouse: WarehouseCode | None = None


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    warehouse: WarehouseCode | None = None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    project_code: str = Field(min_length=2, max_length=120)
    name: str | None = None
    school_name: str | None = None
    warehouse: WarehouseCode | None = None


class ProjectOut(BaseModel):
    id: str
    project_code: str
    name: str | None
    school_name: str | None
    warehouse: WarehouseCode | None
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ExpectedItemOut(BaseModel):
    id: str
    project_id: str
    one_c_code: str | None
    name: str
    quantity: int
    unit: str | None
    warehouse: WarehouseCode | None
    document_number: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class ImportRowOut(BaseModel):
    id: str
    row_number: int
    project_code: str
    item_name: str
    quantity: int
    unit: str | None
    warehouse: WarehouseCode | None
    document_number: str | None
    one_c_code: str | None
    model_config = {"from_attributes": True}


class ImportBatchOut(BaseModel):
    id: str
    filename: str
    status: ImportStatus
    created_at: datetime
    confirmed_at: datetime | None
    rows: list[ImportRowOut] = []
    model_config = {"from_attributes": True}


class ImportConfirmOut(BaseModel):
    batch: ImportBatchOut
    projects_created: int
    expected_items_created: int
    expected_items_skipped: int


class BoxContentCreate(BaseModel):
    expected_item_id: str | None = None
    name: str = Field(min_length=1, max_length=500)
    quantity: int = Field(default=1, gt=0, le=100000)
    unit: str | None = Field(default=None, max_length=50)


class BoxContentOut(BaseModel):
    id: str
    box_id: str
    expected_item_id: str | None
    name: str
    quantity: int
    unit: str | None
    model_config = {"from_attributes": True}


class BoxCreate(BaseModel):
    project_id: str
    label_text: str = Field(min_length=2, max_length=500)
    title: str | None = Field(default=None, max_length=255)
    box_number: int | None = Field(default=None, ge=1, le=10000)
    total_boxes: int | None = Field(default=None, ge=1, le=10000)
    warehouse: WarehouseCode | None = None
    current_location: str | None = Field(default=None, max_length=255)
    contents_text: str | None = None
    comment: str | None = None
    contents: list[BoxContentCreate] = []


class BoxUpdate(BaseModel):
    label_text: str | None = Field(default=None, min_length=2, max_length=500)
    title: str | None = Field(default=None, max_length=255)
    box_number: int | None = Field(default=None, ge=1, le=10000)
    total_boxes: int | None = Field(default=None, ge=1, le=10000)
    current_location: str | None = Field(default=None, max_length=255)
    contents_text: str | None = None
    comment: str | None = None


class BoxOut(BaseModel):
    id: str
    box_code: str
    public_token: str
    project_id: str
    label_text: str
    title: str | None
    box_number: int | None
    total_boxes: int | None
    status: BoxStatus
    current_location: str | None
    warehouse: WarehouseCode | None
    contents_text: str | None
    comment: str | None
    created_by_id: str
    created_at: datetime
    updated_at: datetime
    contents: list[BoxContentOut] = []
    model_config = {"from_attributes": True}


class ProjectDetailOut(ProjectOut):
    expected_items: list[ExpectedItemOut] = []
    boxes: list[BoxOut] = []


class BoxEventCreate(BaseModel):
    event_type: BoxEventType
    location: str | None = Field(default=None, max_length=255)
    comment: str | None = None
class BoxEventOut(BaseModel):
    id: str
    box_id: str
    event_type: BoxEventType
    location: str | None
    actor_id: str
    actor_name: str | None = None
    comment: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class BoxScanIn(BaseModel):
    box_code: str = Field(min_length=1, max_length=80)
    event_type: BoxEventType
    location: str | None = Field(default=None, max_length=255)
    comment: str | None = None


class BoxScanOut(BaseModel):
    success: bool
    message: str
    box: BoxOut | None = None
    event: BoxEventOut | None = None


class InventoryCreate(BaseModel):
    warehouse: WarehouseCode


class InventorySessionOut(BaseModel):
    id: str
    warehouse: WarehouseCode
    status: InventoryStatus
    started_by_id: str
    started_at: datetime
    finished_at: datetime | None
    model_config = {"from_attributes": True}


class InventoryScanIn(BaseModel):
    code: str = Field(min_length=1, max_length=80)


class InventoryScanOut(BaseModel):
    id: str
    session_id: str
    box_id: str | None
    scanned_code: str
    result: InventoryScanResult
    scanned_at: datetime
    model_config = {"from_attributes": True}


class InventorySummaryOut(BaseModel):
    session: InventorySessionOut
    expected_total: int
    scanned_total: int
    found_total: int
    missing_boxes: list[BoxOut]
    extra_scans: list[InventoryScanOut]
