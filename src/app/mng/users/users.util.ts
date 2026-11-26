import { SystemConstant } from '@constants/system.constant';
import { IFaculty } from '@models/faculty/faculty.model';
import { IUser, Role } from '@models/user/user.model';

export type FacultyLookupMap = ReadonlyMap<string, Pick<IFaculty, 'code' | 'name'>>;

/** Nhãn tiếng Việt của vai trò, tạo một lần từ danh sách hằng số dùng chung. */
export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  SystemConstant.ROLE_TITLE.map(item => [item.id, item.title.vi]),
);

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** Tra cứu mã/tên Khoa từ trường phẳng hoặc qua `facultyId` trong bảng Khoa đã nạp. */
export function resolveUserFaculty(
  user: Pick<IUser, 'facultyId' | 'facultyCode' | 'facultyName'>,
  facultyMap?: FacultyLookupMap,
): { code?: string; name?: string; } | null {
  const matched = user.facultyId ? facultyMap?.get(user.facultyId) : undefined;
  const code = user.facultyCode ?? matched?.code ?? undefined;
  const name = user.facultyName ?? matched?.name ?? undefined;
  if (!code && !name) {
    return null;
  }
  return { code, name };
}

/** Định dạng nhãn Khoa phụ trách của người dùng, trả `null` khi chưa được gán Khoa. */
export function formatUserFacultyLabel(
  user: Pick<IUser, 'facultyId' | 'facultyCode' | 'facultyName'>,
  facultyMap?: FacultyLookupMap,
): string | null {
  const resolved = resolveUserFaculty(user, facultyMap);
  if (resolved?.code && resolved?.name) {
    return `${resolved.code} - ${resolved.name}`;
  }
  if (resolved?.name ?? resolved?.code) {
    return resolved?.name ?? resolved?.code ?? null;
  }
  return user.facultyId ? 'Đã gán Khoa' : null;
}

/** Mô tả phạm vi quản lý/truy cập theo vai trò phẳng và Khoa phụ trách. */
export function describeRoleScope(
  role: Role,
  user: Pick<IUser, 'facultyId' | 'facultyCode' | 'facultyName'>,
  facultyMap?: FacultyLookupMap,
): string {
  switch (role) {
    case SystemConstant.ROLE.ADMIN:
      return 'Toàn hệ thống';
    case SystemConstant.ROLE.QA:
      return 'Đọc toàn hệ thống';
    case SystemConstant.ROLE.PROGRAM_MANAGER:
      return formatUserFacultyLabel(user, facultyMap) ?? 'Chưa gán Khoa';
    case SystemConstant.ROLE.LECTURER:
      return 'Theo lớp học phần';
    default:
      return '—';
  }
}
