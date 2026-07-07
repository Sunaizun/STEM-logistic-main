"""initial production schema

Revision ID: 20260618_0001
Revises:
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260618_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('ADMIN','MANAGER','WAREHOUSE','AUDITOR','VIEWER', name='userrole', create_type=False), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'), sa.UniqueConstraint('email'))
    op.create_index(op.f('ix_users_email'), 'users', ['email'])

    op.create_table('projects',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_code', sa.String(length=120), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('school_name', sa.String(length=255), nullable=True),
        sa.Column('warehouse', sa.Enum('ASTANA','ALMATY', name='warehousecode', create_type=False), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE','ARCHIVED', name='projectstatus', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'), sa.UniqueConstraint('project_code'))
    op.create_index(op.f('ix_projects_project_code'), 'projects', ['project_code'])

    op.create_table('import_batches',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('status', sa.Enum('UPLOADED','CONFIRMED','FAILED', name='importstatus', create_type=False), nullable=False),
        sa.Column('uploaded_by_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id']), sa.PrimaryKeyConstraint('id'))

    op.create_table('import_rows',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('batch_id', sa.String(length=36), nullable=False),
        sa.Column('row_number', sa.Integer(), nullable=False),
        sa.Column('project_code', sa.String(length=120), nullable=False),
        sa.Column('item_name', sa.String(length=500), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('warehouse', sa.Enum('ASTANA','ALMATY', name='warehousecode', create_type=False), nullable=True),
        sa.Column('document_number', sa.String(length=160), nullable=True),
        sa.Column('one_c_code', sa.String(length=160), nullable=True),
        sa.Column('raw_json', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['batch_id'], ['import_batches.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index(op.f('ix_import_rows_batch_id'), 'import_rows', ['batch_id'])
    op.create_index(op.f('ix_import_rows_project_code'), 'import_rows', ['project_code'])

    op.create_table('expected_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('one_c_code', sa.String(length=160), nullable=True),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('warehouse', sa.Enum('ASTANA','ALMATY', name='warehousecode', create_type=False), nullable=True),
        sa.Column('document_number', sa.String(length=160), nullable=True),
        sa.Column('source_import_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['source_import_id'], ['import_batches.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id','one_c_code','name','document_number', name='uq_expected_item_source'))
    op.create_index(op.f('ix_expected_items_project_id'), 'expected_items', ['project_id'])
    op.create_index(op.f('ix_expected_items_one_c_code'), 'expected_items', ['one_c_code'])

    op.create_table('boxes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('box_code', sa.String(length=40), nullable=False),
        sa.Column('public_token', sa.String(length=80), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('label_text', sa.String(length=500), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('box_number', sa.Integer(), nullable=True),
        sa.Column('total_boxes', sa.Integer(), nullable=True),
        sa.Column('status', sa.Enum('CREATED','IN_WAREHOUSE','SHIPPED','DELIVERED','LOST','ARCHIVED', name='boxstatus', create_type=False), nullable=False),
        sa.Column('current_location', sa.String(length=255), nullable=True),
        sa.Column('warehouse', sa.Enum('ASTANA','ALMATY', name='warehousecode', create_type=False), nullable=True),
        sa.Column('contents_text', sa.Text(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'), sa.UniqueConstraint('box_code'), sa.UniqueConstraint('public_token'))
    op.create_index(op.f('ix_boxes_box_code'), 'boxes', ['box_code'])
    op.create_index(op.f('ix_boxes_project_id'), 'boxes', ['project_id'])
    op.create_index(op.f('ix_boxes_public_token'), 'boxes', ['public_token'])
    op.create_index(op.f('ix_boxes_status'), 'boxes', ['status'])

    op.create_table('box_contents',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('box_id', sa.String(length=36), nullable=False),
        sa.Column('expected_item_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['box_id'], ['boxes.id']),
        sa.ForeignKeyConstraint(['expected_item_id'], ['expected_items.id']),
        sa.PrimaryKeyConstraint('id'))
    op.create_index(op.f('ix_box_contents_box_id'), 'box_contents', ['box_id'])

    op.create_table('box_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('box_id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.Enum('CREATED','WAREHOUSE_IN','WAREHOUSE_OUT','DELIVERED','INVENTORY_FOUND','COMMENT','UPDATED', name='boxeventtype', create_type=False), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=True),
        sa.Column('actor_id', sa.String(length=36), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.ForeignKeyConstraint(['box_id'], ['boxes.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index(op.f('ix_box_events_box_id'), 'box_events', ['box_id'])
    op.create_index(op.f('ix_box_events_event_type'), 'box_events', ['event_type'])

    op.create_table('inventory_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('warehouse', sa.Enum('ASTANA','ALMATY', name='warehousecode', create_type=False), nullable=False),
        sa.Column('status', sa.Enum('OPEN','FINISHED','CANCELLED', name='inventorystatus', create_type=False), nullable=False),
        sa.Column('started_by_id', sa.String(length=36), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['started_by_id'], ['users.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index(op.f('ix_inventory_sessions_warehouse'), 'inventory_sessions', ['warehouse'])

    op.create_table('inventory_scans',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('box_id', sa.String(length=36), nullable=True),
        sa.Column('scanned_code', sa.String(length=80), nullable=False),
        sa.Column('result', sa.Enum('FOUND','EXTRA','UNKNOWN','DUPLICATE', name='inventoryscanresult', create_type=False), nullable=False),
        sa.Column('scanned_by_id', sa.String(length=36), nullable=False),
        sa.Column('scanned_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['box_id'], ['boxes.id']),
        sa.ForeignKeyConstraint(['scanned_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['session_id'], ['inventory_sessions.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id','scanned_code', name='uq_inventory_session_code'))
    op.create_index(op.f('ix_inventory_scans_session_id'), 'inventory_scans', ['session_id'])
    op.create_index(op.f('ix_inventory_scans_scanned_code'), 'inventory_scans', ['scanned_code'])

    op.create_table('audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('action', sa.String(length=120), nullable=False),
        sa.Column('entity_type', sa.String(length=120), nullable=False),
        sa.Column('entity_id', sa.String(length=120), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'])


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('inventory_scans')
    op.drop_table('inventory_sessions')
    op.drop_table('box_events')
    op.drop_table('box_contents')
    op.drop_table('boxes')
    op.drop_table('expected_items')
    op.drop_table('import_rows')
    op.drop_table('import_batches')
    op.drop_table('projects')
    op.drop_table('users')