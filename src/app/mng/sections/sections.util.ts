import { IApiFieldError } from '@models/common/response-data.model';

/** Dấu hiển thị cho dữ liệu chưa có (không bao giờ hiện 0 thay cho thiếu). */
export const NOT_AVAILABLE = '—';

/** Dấu BOM để Excel nhận đúng UTF-8 khi mở tệp CSV tiếng Việt. */
const UTF8_BOM = '\uFEFF';

/**
 * Sĩ số hiển thị ở danh sách lớp. Backend mặc định `enrolledCount = 0` cho lớp mới mở nên 0 và "chưa nhập
 * danh sách" không phân biệt được ở đây: cả null/undefined lẫn 0 đều hiện "—" (ghi chú kèm theo ở giao diện).
 */
export function displayEnrolledCount(count: number | null | undefined): string {
  return typeof count === 'number' && count > 0 ? String(count) : NOT_AVAILABLE;
}

/** Số dòng trong tên trường lỗi của backend (`"line 12"`); null nếu tên trường không theo mẫu đó. */
export function parseImportLine(field: string): number | null {
  const match = /^line\s+(\d+)$/i.exec(field.trim());
  return match ? Number(match[1]) : null;
}

export interface IRosterRowError {
  /** Số dòng trong tệp (dòng 1 là dòng tiêu đề); null nếu lỗi không gắn với một dòng. */
  line: number | null;
  /** Giá trị bị từ chối đã chuẩn hóa thành chuỗi; rỗng nghĩa là ô trống. */
  rejectedValue: string;
  message: string;
}

/** Giá trị bị từ chối là chuỗi hoặc số; kiểu khác (đối tượng) không hiển thị để tránh '[object Object]'. */
function stringifyRejected(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

/** Chuyển `fieldErrors[]` của 422 thành các dòng lỗi để hiển thị, giữ nguyên thứ tự backend trả về. */
export function toRosterRowErrors(fieldErrors: readonly IApiFieldError[]): IRosterRowError[] {
  return fieldErrors.map(item => ({
    line: parseImportLine(item.field),
    rejectedValue: stringifyRejected(item.rejectedValue),
    message: item.message,
  }));
}

function csvCell(value: string): string {
  // Chặn "CSV injection" khi mở bằng bảng tính: ô bắt đầu bằng = + - @ được đặt trong nháy đơn
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Nội dung CSV "bản báo lỗi" (UTF-8 kèm BOM để Excel đọc đúng tiếng Việt) để người dùng sửa tệp rồi tải lại. */
export function buildRosterErrorCsv(errors: readonly IRosterRowError[]): string {
  const rows = errors.map(e => [e.line === null ? '' : String(e.line), e.rejectedValue, e.message].map(csvCell).join(','));
  return `${UTF8_BOM}dong,studentRef,loi\n${rows.join('\n')}\n`;
}

/** Tệp mẫu: chỉ ba cột hệ thống đọc; mã sinh viên trong mẫu là mã giả. */
export const ROSTER_TEMPLATE_CSV = UTF8_BOM + 'studentRef,cohort,majorCode\nSV-0001,2023,CNTT\nSV-0002,2023,CNTT\n';

/** Backend không cấu hình riêng giới hạn tệp nên áp mặc định 1 MB của Spring (5000 dòng CSV chỉ cỡ vài trăm KB). */
export const MAX_ROSTER_FILE_BYTES = 1024 * 1024;

/** Kiểm tra nhanh phía client để báo lỗi sớm; backend vẫn kiểm lại và quyết định (US-20/AC-3). */
export function validateRosterFile(file: { name: string; size: number; }): string | null {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return 'Chỉ nhận tệp CSV (.csv). Tệp Excel (.xlsx) chưa được hỗ trợ.';
  }
  if (file.size === 0) {
    return 'Tệp rỗng, không có dòng nào để ghi danh.';
  }
  if (file.size > MAX_ROSTER_FILE_BYTES) {
    return 'Tệp quá lớn (tối đa 1 MB).';
  }
  return null;
}

/** Chuỗi ngắn để nhận diện một ObjectId khi chưa tra được tên (backend chỉ trả ID giảng viên). */
export function shortId(id: string): string {
  return id.length > 6 ? id.slice(-6) : id;
}

/**
 * Nhãn giảng viên phụ trách. Backend chỉ trả `lecturerIds`; tên lấy từ danh sách người dùng khi người xem
 * có quyền tải (ADMIN), hoặc "Bạn" khi đó là chính người đăng nhập. Không tra được thì hiện mã ngắn, không đoán tên.
 */
export function lecturerLabel(id: string, names: ReadonlyMap<string, string>, currentUserId: string): string {
  const name = names.get(id);
  if (name) {
    return name;
  }
  return id === currentUserId ? 'Bạn' : `GV …${shortId(id)}`;
}
