import { describeRoleScope, roleLabel } from './users.util';

describe('users.util (roles phẳng & phạm vi theo Khoa)', () => {
  describe('describeRoleScope', () => {
    it('diễn giải đúng phạm vi cho ADMIN, QA, LECTURER', () => {
      expect(describeRoleScope('ADMIN', {})).toBe('Toàn hệ thống');
      expect(describeRoleScope('QA', {})).toBe('Đọc toàn hệ thống');
      expect(describeRoleScope('LECTURER', {})).toBe('Theo lớp học phần');
    });

    it('diễn giải Khoa phụ trách cho PROGRAM_MANAGER', () => {
      expect(describeRoleScope('PROGRAM_MANAGER', {
        facultyCode: 'FIT',
        facultyName: 'Khoa Công nghệ Thông tin',
      })).toBe('FIT - Khoa Công nghệ Thông tin');
      expect(describeRoleScope('PROGRAM_MANAGER', { facultyName: 'Khoa Cơ khí' })).toBe('Khoa Cơ khí');
      expect(describeRoleScope('PROGRAM_MANAGER', { facultyId: 'fac_fit_01' }, new Map([
        ['fac_fit_01', { code: 'FIT', name: 'Khoa Công nghệ Thông tin' }],
      ]))).toBe('FIT - Khoa Công nghệ Thông tin');
      expect(describeRoleScope('PROGRAM_MANAGER', { facultyId: 'fac_unknown' })).toBe('Đã gán Khoa');
      expect(describeRoleScope('PROGRAM_MANAGER', {})).toBe('Chưa gán Khoa');
    });
  });

  describe('roleLabel', () => {
    it('trả nhãn tiếng Việt, và giữ nguyên mã lạ', () => {
      expect(roleLabel('LECTURER')).toBe('Giảng viên');
      expect(roleLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    });
  });
});
