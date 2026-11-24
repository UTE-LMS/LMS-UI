import { IApiFieldError } from '@models/common/response-data.model';
import { ISection } from '@models/course/section.model';
import { importFileNameError } from '@services/common/import-file.util';

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
  return `${UTF8_BOM}dong,studentCode,loi\n${rows.join('\n')}\n`;
}

/** Tệp mẫu: chỉ hai cột hệ thống đọc; mã số sinh viên trong mẫu là mã giả. */
export const ROSTER_TEMPLATE_CSV = UTF8_BOM + 'studentCode,cohort\nSV-0001,2023\nSV-0002,2023\n';

/** Backend không cấu hình riêng giới hạn tệp nên áp mặc định 1 MB của Spring (5000 dòng CSV chỉ cỡ vài trăm KB). */
export const MAX_ROSTER_FILE_BYTES = 1024 * 1024;

/** Kiểm tra nhanh phía client để báo lỗi sớm; backend vẫn kiểm lại và quyết định (US-20/AC-3). */
export function validateRosterFile(file: { name: string; size: number; }): string | null {
  const nameError = importFileNameError(file.name);
  if (nameError) {
    return nameError;
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

function firstNonEmpty(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

/** Tên hiển thị ưu tiên họ tên đầy đủ (`fullName`), chỉ rơi về `username` khi chưa có họ tên. */
export function userDisplayName(user: { fullName?: string | null; username?: string | null; }): string {
  return firstNonEmpty(user.fullName, user.username);
}

/**
 * Nhãn giảng viên phụ trách. Ưu tiên họ tên tra được từ danh sách người dùng / giảng viên cùng khoa,
 * hoặc tên người đăng nhập hiện tại (rơi về "Bạn") nếu trùng `currentUserId`; không tra được thì hiện mã ngắn.
 */
export function lecturerLabel(
  id: string,
  names: ReadonlyMap<string, string>,
  currentUserId: string,
  currentUserName?: string,
): string {
  const name = firstNonEmpty(names.get(id));
  if (name) {
    return name;
  }
  if (id === currentUserId) {
    return firstNonEmpty(currentUserName) || 'Bạn';
  }
  return `GV …${shortId(id)}`;
}

/** Ghép danh sách tên giảng viên của lớp học phần (hỗ trợ cả `section.lecturers`, `section.lecturerNames` và `section.lecturerIds`). */
export function sectionLecturersText(
  section: ISection | null | undefined,
  names: ReadonlyMap<string, string>,
  currentUserId: string,
  currentUserName?: string,
): string {
  if (!section) {
    return NOT_AVAILABLE;
  }
  let labels: string[];
  if (section.lecturers && section.lecturers.length > 0) {
    labels = section.lecturers.map(entry => (
      firstNonEmpty(entry.fullName, names.get(entry.id), entry.username)
      || lecturerLabel(entry.id, names, currentUserId, currentUserName)
    ));
  } else if (section.lecturerNames && section.lecturerNames.length > 0) {
    labels = section.lecturerNames.map((rawName, idx) => (
      firstNonEmpty(rawName)
      || lecturerLabel(section.lecturerIds[idx] ?? '', names, currentUserId, currentUserName)
    ));
  } else {
    labels = section.lecturerIds.map(id => lecturerLabel(id, names, currentUserId, currentUserName));
  }
  const filtered = labels.map(item => item.trim()).filter(item => item.length > 0);
  return filtered.length > 0 ? filtered.join(', ') : NOT_AVAILABLE;
}
