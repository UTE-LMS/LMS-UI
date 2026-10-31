import { IRoleAssignment } from '@models/user/user.model';
import { describeScope, isScopeEmpty, roleLabel, scopeIdsTooltip, toAssignmentRow, toRoleAssignment } from './users.util';

const ID_A = '671dcba5f123456789abcd01';
const ID_B = '671dcba5f123456789abcd02';

describe('users.util (F01 §4.3 phạm vi)', () => {
  describe('isScopeEmpty - US-03/AC-4', () => {
    it('scope null hoặc undefined là rỗng', () => {
      expect(isScopeEmpty(null)).toBe(true);
      expect(isScopeEmpty(undefined)).toBe(true);
    });

    it('cả ba mảng rỗng là rỗng', () => {
      expect(isScopeEmpty({ programIds: [], courseIds: [], sectionIds: [] })).toBe(true);
    });

    it('chỉ có programIds KHÔNG phải rỗng (tránh VIEWER bị coi là đọc toàn hệ thống)', () => {
      expect(isScopeEmpty({ programIds: [ID_A], courseIds: [], sectionIds: [] })).toBe(false);
    });

    it('có courseIds hoặc sectionIds là không rỗng', () => {
      expect(isScopeEmpty({ programIds: [], courseIds: [ID_A], sectionIds: [] })).toBe(false);
      expect(isScopeEmpty({ programIds: [], courseIds: [], sectionIds: [ID_B] })).toBe(false);
    });
  });

  describe('describeScope', () => {
    const empty = null;

    it('phạm vi rỗng được diễn giải theo vai trò', () => {
      expect(describeScope({ role: 'ADMIN', scope: empty })).toBe('Toàn hệ thống');
      expect(describeScope({ role: 'VIEWER', scope: empty })).toBe('Đọc toàn hệ thống');
      // Vai trò nghiệp vụ khác bị từ chối khi scope rỗng nên không được ghi như có quyền
      expect(describeScope({ role: 'LECTURER', scope: empty })).toBe('Chưa gán');
      expect(describeScope({ role: 'QA_OFFICER', scope: empty })).toBe('Chưa gán');
    });

    it('đếm số mục theo từng loại phạm vi', () => {
      const assignment: IRoleAssignment = {
        role: 'LECTURER',
        scope: { programIds: [], courseIds: [ID_A], sectionIds: [ID_A, ID_B] },
      };
      expect(describeScope(assignment)).toBe('1 học phần, 2 lớp');
    });

    it('VIEWER chỉ có programIds hiển thị số CTĐT chứ không phải "Đọc toàn hệ thống"', () => {
      const assignment: IRoleAssignment = {
        role: 'VIEWER',
        scope: { programIds: [ID_A], courseIds: [], sectionIds: [] },
      };
      expect(describeScope(assignment)).toBe('1 CTĐT');
    });
  });

  describe('scopeIdsTooltip', () => {
    it('rỗng khi không có phạm vi', () => {
      expect(scopeIdsTooltip(null)).toBe('');
    });

    it('liệt kê từng ID kèm loại', () => {
      expect(scopeIdsTooltip({ programIds: [ID_A], courseIds: [ID_B], sectionIds: [] }))
        .toBe(`CTĐT ${ID_A}\nHọc phần ${ID_B}`);
    });
  });

  describe('toRoleAssignment', () => {
    it('ADMIN luôn gửi scope null dù form có nhập ID', () => {
      const result = toRoleAssignment({ role: 'ADMIN', programIds: [ID_A], courseIds: [], sectionIds: [] });
      expect(result).toEqual({ role: 'ADMIN', scope: null });
    });

    it('phạm vi rỗng gửi null', () => {
      const result = toRoleAssignment({ role: 'VIEWER', programIds: [], courseIds: [], sectionIds: [] });
      expect(result.scope).toBeNull();
    });

    it('cắt khoảng trắng, bỏ phần tử rỗng và trùng', () => {
      const result = toRoleAssignment({
        role: 'LECTURER',
        programIds: [],
        courseIds: [` ${ID_A} `, ID_A, ''],
        sectionIds: [ID_B],
      });
      expect(result.scope).toEqual({ programIds: [], courseIds: [ID_A], sectionIds: [ID_B] });
    });
  });

  describe('toAssignmentRow', () => {
    it('phẳng hóa scope null thành ba mảng rỗng', () => {
      expect(toAssignmentRow({ role: 'ADMIN', scope: null }))
        .toEqual({ role: 'ADMIN', programIds: [], courseIds: [], sectionIds: [] });
    });

    it('sao chép mảng để sửa form không làm đổi dữ liệu gốc', () => {
      const assignment: IRoleAssignment = {
        role: 'LECTURER',
        scope: { programIds: [], courseIds: [ID_A], sectionIds: [] },
      };
      const row = toAssignmentRow(assignment);
      row.courseIds.push(ID_B);
      expect(assignment.scope?.courseIds).toEqual([ID_A]);
    });
  });

  describe('roleLabel', () => {
    it('trả nhãn tiếng Việt, và giữ nguyên mã lạ', () => {
      expect(roleLabel('LECTURER')).toBe('Giảng viên');
      expect(roleLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    });
  });
});
