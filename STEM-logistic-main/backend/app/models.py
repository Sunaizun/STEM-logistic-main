import enum
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def uuid4_str() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def public_token() -> str:
    return secrets.token_urlsafe(20)


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    WAREHOUSE = "WAREHOUSE"
    PN = "PN"


class WarehouseCode(str, enum.Enum):
    ASTANA = "ASTANA"
    ALMATY = "ALMATY"


class ProjectStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class BoxStatus(str, enum.Enum):
    CREATED = "CREATED"
    IN_WAREHOUSE = "IN_WAREHOUSE"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    LOST = "LOST"
    ARCHIVED = "ARCHIVED"


class BoxEventType(str, enum.Enum):
    CREATED = "CREATED"
    WAREHOUSE_IN = "WAREHOUSE_IN"
    WAREHOUSE_OUT = "WAREHOUSE_OUT"
    DELIVERED = "DELIVERED"
    INVENTORY_FOUND = "INVENTORY_FOUND"
    COMMENT = "COMMENT"
    UPDATED = "UPDATED"


class ImportStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"


class InventoryStatus(str, enum.Enum):
    OPEN = "OPEN"
    FINISHED = "FINISHED"
    CANCELLED = "CANCELLED"


class InventoryScanResult(str, enum.Enum):
    FOUND = "FOUND"
    EXTRA = "EXTRA"
    UNKNOWN = "UNKNOWN"
    DUPLICATE = "DUPLICATE"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.WAREHOUSE)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    warehouse: Mapped[WarehouseCode | None] = mapped_column(Enum(WarehouseCode), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    project_code: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    school_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    warehouse: Mapped[WarehouseCode | None] = mapped_column(Enum(WarehouseCode), nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    expected_items: Mapped[list["ExpectedItem"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    boxes: Mapped[list["Box"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ImportStatus] = mapped_column(Enum(ImportStatus), default=ImportStatus.UPLOADED, nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    uploaded_by: Mapped[User] = relationship()
    rows: Mapped[list["ImportRow"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class ImportRow(Base):
    __tablename__ = "import_rows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    batch_id: Mapped[str] = mapped_column(String(36), ForeignKey("import_batches.id"), nullable=False, index=True)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    project_code: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    item_name: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    warehouse: Mapped[WarehouseCode | None] = mapped_column(Enum(WarehouseCode), nullable=True)
    document_number: Mapped[str | None] = mapped_column(String(160), nullable=True)
    one_c_code: Mapped[str | None] = mapped_column(String(160), nullable=True)
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    batch: Mapped[ImportBatch] = relationship(back_populates="rows")


class ExpectedItem(Base):
    __tablename__ = "expected_items"
    __table_args__ = (
        UniqueConstraint("project_id", "one_c_code", "name", "document_number", name="uq_expected_item_source"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    one_c_code: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    warehouse: Mapped[WarehouseCode | None] = mapped_column(Enum(WarehouseCode), nullable=True)
    document_number: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_import_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("import_batches.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    project: Mapped[Project] = relationship(back_populates="expected_items")
    contents: Mapped[list["BoxContent"]] = relationship(back_populates="expected_item")


class Box(Base):
    __tablename__ = "boxes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    box_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    public_token: Mapped[str] = mapped_column(String(80), unique=True, index=True, default=public_token, nullable=False)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    label_text: Mapped[str] = mapped_column(String(500), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    box_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_boxes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[BoxStatus] = mapped_column(Enum(BoxStatus), default=BoxStatus.CREATED, nullable=False, index=True)
    current_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    warehouse: Mapped[WarehouseCode | None] = mapped_column(Enum(WarehouseCode), nullable=True)
    contents_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    project: Mapped[Project] = relationship(back_populates="boxes")
    created_by: Mapped[User] = relationship()
    contents: Mapped[list["BoxContent"]] = relationship(back_populates="box", cascade="all, delete-orphan")
    events: Mapped[list["BoxEvent"]] = relationship(back_populates="box", cascade="all, delete-orphan")


class BoxContent(Base):
    __tablename__ = "box_contents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    box_id: Mapped[str] = mapped_column(String(36), ForeignKey("boxes.id"), nullable=False, index=True)
    expected_item_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("expected_items.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)

    box: Mapped[Box] = relationship(back_populates="contents")
    expected_item: Mapped[ExpectedItem | None] = relationship(back_populates="contents")


class BoxEvent(Base):
    __tablename__ = "box_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    box_id: Mapped[str] = mapped_column(String(36), ForeignKey("boxes.id"), nullable=False, index=True)
    event_type: Mapped[BoxEventType] = mapped_column(Enum(BoxEventType), nullable=False, index=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    box: Mapped[Box] = relationship(back_populates="events")
    actor: Mapped[User] = relationship()


class InventorySession(Base):
    __tablename__ = "inventory_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    warehouse: Mapped[WarehouseCode] = mapped_column(Enum(WarehouseCode), nullable=False, index=True)
    status: Mapped[InventoryStatus] = mapped_column(Enum(InventoryStatus), default=InventoryStatus.OPEN, nullable=False)
    started_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    started_by: Mapped[User] = relationship()
    scans: Mapped[list["InventoryScan"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class InventoryScan(Base):
    __tablename__ = "inventory_scans"
    __table_args__ = (UniqueConstraint("session_id", "scanned_code", name="uq_inventory_session_code"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("inventory_sessions.id"), nullable=False, index=True)
    box_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("boxes.id"), nullable=True)
    scanned_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    result: Mapped[InventoryScanResult] = mapped_column(Enum(InventoryScanResult), nullable=False)
    scanned_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    session: Mapped[InventorySession] = relationship(back_populates="scans")
    box: Mapped[Box | None] = relationship()
    scanned_by: Mapped[User] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid4_str)
    actor_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    actor: Mapped[User | None] = relationship()
