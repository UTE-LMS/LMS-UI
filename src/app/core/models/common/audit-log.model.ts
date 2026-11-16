/** Hành động được ghi nhật ký (enum AuditAction của backend). */
export type AuditAction =
  | 'SCORE_UPDATE'
  | 'IMPORT_CONFIRM'
  | 'ASSESSMENT_LOCK'
  | 'ASSESSMENT_UNLOCK'
  | 'RUN_CALCULATION'
  | 'LOGIN'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'IMPORT';

/** Thực thể bị tác động: tên collection và ID bản ghi (AuditEntity). */
export interface IAuditEntity {
  collection: string;
  id: string;
}

/** AuditLogResponse của GET /api/v1/audit-logs. `before`/`after` là ảnh chụp tự do, có thể null. */
export interface IAuditLog {
  id: string;
  at: string;
  userId: string | null;
  action: AuditAction;
  entity: IAuditEntity | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  ip: string | null;
}

/** Bộ lọc (query param). Các điều kiện kết hợp bằng AND; `from`/`to` là chuỗi ISO-8601. */
export interface IAuditLogFilter {
  action: AuditAction;
  entity: string;
  entityId: string;
  userId: string;
  from: string;
  to: string;
}
