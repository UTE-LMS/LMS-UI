import { SystemConstant } from '@constants/system.constant';
import { IUser, Role } from '@models/user/user.model';

/** Nhãn tiếng Việt của vai trò, tạo một lần từ danh sách hằng số dùng chung. */
export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  SystemConstant.ROLE_TITLE.map(item => [item.id, item.title.vi]),
);

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** Mô tả phạm vi quản lý/truy cập theo vai trò phẳng và Khoa phụ trách. */
export function describeRoleScope(
  role: Role,
  user: Pick<IUser, 'facultyCode' | 'facultyName'>,
): string {
  switch (role) {
    case SystemConstant.ROLE.ADMIN:
      return 'Toàn hệ thống';
    case SystemConstant.ROLE.QA:
      return 'Đọc toàn hệ thống';
    case SystemConstant.ROLE.PROGRAM_MANAGER:
      if (user.facultyCode && user.facultyName) {
        return `${user.facultyCode} - ${user.facultyName}`;
      }
      return user.facultyName ?? user.facultyCode ?? 'Chưa gán Khoa';
    case SystemConstant.ROLE.LECTURER:
      return 'Theo lớp học phần';
    default:
      return '—';
  }
}
