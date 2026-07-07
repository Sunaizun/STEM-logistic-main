export type UserRole = 'ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'PN';
export type WarehouseCode = 'ASTANA' | 'ALMATY';
export type BoxStatus = 'CREATED' | 'IN_WAREHOUSE' | 'SHIPPED' | 'DELIVERED' | 'LOST' | 'ARCHIVED';
export type BoxEventType = 'CREATED' | 'WAREHOUSE_IN' | 'WAREHOUSE_OUT' | 'DELIVERED' | 'INVENTORY_FOUND' | 'COMMENT' | 'UPDATED';

export interface UserOut { id: string; name: string; email: string; role: UserRole; warehouse?: WarehouseCode | null; is_active: boolean; created_at: string; }
export interface ProjectOut { id: string; project_code: string; name?: string | null; school_name?: string | null; warehouse?: WarehouseCode | null; status: string; created_at: string; updated_at: string; }
export interface BoxContentOut { id: string; box_id: string; expected_item_id?: string | null; name: string; quantity: number; unit?: string | null; }
export interface BoxOut { id: string; box_code: string; public_token: string; project_id: string; label_text: string; title?: string | null; box_number?: number | null; total_boxes?: number | null; status: BoxStatus; current_location?: string | null; warehouse?: WarehouseCode | null; contents_text?: string | null; comment?: string | null; created_by_id: string; created_at: string; updated_at: string; contents: BoxContentOut[]; }
export interface ProjectDetailOut extends ProjectOut { expected_items: any[]; boxes: BoxOut[]; }
export interface BoxEventOut { id: string; box_id: string; event_type: BoxEventType; location?: string | null; actor_id: string; actor_name?: string | null; comment?: string | null; created_at: string; }
export interface BoxScanOut { success: boolean; message: string; box?: BoxOut | null; event?: BoxEventOut | null; }
export interface ImportRowOut { id: string; row_number: number; project_code: string; item_name: string; quantity: number; unit?: string | null; warehouse?: WarehouseCode | null; document_number?: string | null; one_c_code?: string | null; }
export interface ImportBatchOut { id: string; filename: string; status: string; created_at?: string; confirmed_at?: string | null; rows: ImportRowOut[]; }
export interface ImportConfirmOut { batch: ImportBatchOut; projects_created: number; expected_items_created: number; expected_items_skipped: number; }
export interface InventorySessionOut { id: string; warehouse: WarehouseCode; status: string; }
export interface InventorySummaryOut { session: InventorySessionOut; expected_total: number; scanned_total: number; }
