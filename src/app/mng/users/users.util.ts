import { SystemConstant } from '@constants/system.constant';
import { IRoleAssignment, IUserScope, UserRole } from '@models/user/user.model';

/** Một dòng "vai trò + phạm vi" trong form: phẳng hóa IRoleAssignment để mỗi mảng ID là một ô nhập riêng. */
export interface IRoleAssignmentRow extends IUserScope {
  role: UserRole;
}

/** Nhãn tiếng Việt của vai trò, tạo một lần từ danh sách hằng số dùng chung. */
export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  SystemConstant.ROLE_TITLE.map(item => [item.id, item.title.vi]),
);

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/**
 * Phạm vi rỗng theo F01 §4.3: `scope == null` hoặc cả ba mảng đều rỗng/null.
 * Chỉ cần một ID ở bất kỳ mảng nào thì KHÔNG rỗng (ví dụ chỉ có programIds vẫn không phải rỗng).
 */
export function isScopeEmpty(scope: IUserScope | null | undefined): boolean {
  return !scope || (!scope.programIds?.length && !scope.courseIds?.length && !scope.sectionIds?.length);
}

/**
 * Dòng mô tả phạm vi để hiển thị trong bảng. Ý nghĩa của phạm vi rỗng phụ thuộc vai trò (F01 §4.3):
 * ADMIN toàn quyền, VIEWER đọc toàn hệ thống, các vai trò khác bị từ chối (fail-closed) nên ghi "Chưa gán".
 */
export function describeScope(assignment: IRoleAssignment): string {
  if (isScopeEmpty(assignment.scope)) {
    switch (assignment.role) {
      case SystemConstant.ROLE.ADMIN:
        return 'Toàn hệ thống';
      case SystemConstant.ROLE.VIEWER:
        return 'Đọc toàn hệ thống';
      default:
        return 'Chưa gán';
    }
  }
  const scope = assignment.scope as IUserScope;
  const parts: string[] = [];
  if (scope.programIds?.length) {
    parts.push(`${scope.programIds.length} CTĐT`);
  }
  if (scope.courseIds?.length) {
    parts.push(`${scope.courseIds.length} học phần`);
  }
  if (scope.sectionIds?.length) {
    parts.push(`${scope.sectionIds.length} lớp`);
  }
  return parts.join(', ');
}

/** Toàn bộ ID trong phạm vi, dùng làm tooltip vì chưa có API danh mục để đổi ID thành tên. */
export function scopeIdsTooltip(scope: IUserScope | null | undefined): string {
  if (isScopeEmpty(scope)) {
    return '';
  }
  const value = scope as IUserScope;
  return [
    ...(value.programIds ?? []).map(id => `CTĐT ${id}`),
    ...(value.courseIds ?? []).map(id => `Học phần ${id}`),
    ...(value.sectionIds ?? []).map(id => `Lớp ${id}`),
  ].join('\n');
}

export function toAssignmentRow(assignment: IRoleAssignment): IRoleAssignmentRow {
  return {
    role: assignment.role,
    programIds: [...(assignment.scope?.programIds ?? [])],
    courseIds: [...(assignment.scope?.courseIds ?? [])],
    sectionIds: [...(assignment.scope?.sectionIds ?? [])],
  };
}

const cleanIds = (ids: string[]): string[] => [...new Set(ids.map(id => id.trim()).filter(Boolean))];

/**
 * Dòng form → phần tử `roleAssignments` gửi backend. Gửi `scope: null` khi phạm vi rỗng, và luôn `null`
 * với ADMIN vì ADMIN toàn quyền, phạm vi không có tác dụng.
 */
export function toRoleAssignment(row: IRoleAssignmentRow): IRoleAssignment {
  const scope: IUserScope = {
    programIds: cleanIds(row.programIds),
    courseIds: cleanIds(row.courseIds),
    sectionIds: cleanIds(row.sectionIds),
  };
  if (row.role === SystemConstant.ROLE.ADMIN || isScopeEmpty(scope)) {
    return { role: row.role, scope: null };
  }
  return { role: row.role, scope };
}
