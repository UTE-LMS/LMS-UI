import {
  buildRosterErrorCsv, displayEnrolledCount, lecturerLabel, MAX_ROSTER_FILE_BYTES, parseImportLine,
  toRosterRowErrors, validateRosterFile,
} from './sections.util';

/** DỮ LIỆU THỬ NGHIỆM: mã sinh viên và ID giả. */
describe('sections.util (F05a)', () => {
  describe('displayEnrolledCount (US-19: "—" là chưa có danh sách, không phải 0)', () => {
    it('hiện số khi lớp có sinh viên', () => {
      expect(displayEnrolledCount(45)).toBe('45');
      expect(displayEnrolledCount(1)).toBe('1');
    });

    it('hiện "—" cho null, undefined và 0 (backend mặc định 0 cho lớp mới)', () => {
      expect(displayEnrolledCount(null)).toBe('—');
      expect(displayEnrolledCount(undefined)).toBe('—');
      expect(displayEnrolledCount(0)).toBe('—');
    });
  });

  describe('parseImportLine (US-20/AC-2)', () => {
    it('đọc số dòng từ "line N"', () => {
      expect(parseImportLine('line 12')).toBe(12);
      expect(parseImportLine('  Line 3 ')).toBe(3);
    });

    it('trả null khi tên trường không theo mẫu', () => {
      expect(parseImportLine('file')).toBeNull();
      expect(parseImportLine('line x')).toBeNull();
      expect(parseImportLine('')).toBeNull();
    });
  });

  describe('toRosterRowErrors (US-20/AC-2)', () => {
    it('giữ thứ tự, chuẩn hóa giá trị trống và null thành chuỗi rỗng', () => {
      const rows = toRosterRowErrors([
        { field: 'line 12', message: 'Thiếu studentRef', rejectedValue: '' },
        { field: 'line 30', message: 'studentRef trùng với dòng 17 trong tệp', rejectedValue: 'SV-0018' },
        { field: 'line 41', message: 'Sinh viên đã ghi danh lớp này', rejectedValue: null },
      ]);
      expect(rows).toEqual([
        { line: 12, rejectedValue: '', message: 'Thiếu studentRef' },
        { line: 30, rejectedValue: 'SV-0018', message: 'studentRef trùng với dòng 17 trong tệp' },
        { line: 41, rejectedValue: '', message: 'Sinh viên đã ghi danh lớp này' },
      ]);
    });

    it('danh sách rỗng cho kết quả rỗng', () => {
      expect(toRosterRowErrors([])).toEqual([]);
    });
  });

  describe('buildRosterErrorCsv', () => {
    it('có BOM, tiêu đề, và đặt ô có dấu phẩy/nháy kép trong nháy kép', () => {
      const csv = buildRosterErrorCsv([
        { line: 12, rejectedValue: '', message: 'Thiếu studentRef' },
        { line: 30, rejectedValue: 'SV,"1"', message: 'Lỗi' },
      ]);
      expect(csv.startsWith('\uFEFFdong,studentRef,loi\n')).toBe(true);
      expect(csv).toContain('12,,Thiếu studentRef');
      expect(csv).toContain('30,"SV,""1""",Lỗi');
    });

    it('chặn CSV injection: ô bắt đầu bằng = + - @ được đặt dấu nháy đơn', () => {
      const csv = buildRosterErrorCsv([{ line: null, rejectedValue: '=SUM(A1)', message: 'x' }]);
      expect(csv).toContain(',\'=SUM(A1),');
    });
  });

  describe('validateRosterFile (US-20/AC-3: báo lỗi sớm; backend vẫn quyết định)', () => {
    it('chấp nhận tệp .csv có nội dung (cả chữ hoa)', () => {
      expect(validateRosterFile({ name: 'lop.csv', size: 120 })).toBeNull();
      expect(validateRosterFile({ name: 'LOP.CSV', size: 1 })).toBeNull();
    });

    it('từ chối tệp không phải CSV, ví dụ Excel', () => {
      expect(validateRosterFile({ name: 'lop.xlsx', size: 120 })).toContain('CSV');
    });

    it('từ chối tệp rỗng', () => {
      expect(validateRosterFile({ name: 'lop.csv', size: 0 })).toContain('rỗng');
    });

    it('biên: đúng giới hạn thì chấp nhận, vượt 1 byte thì từ chối', () => {
      expect(validateRosterFile({ name: 'lop.csv', size: MAX_ROSTER_FILE_BYTES })).toBeNull();
      expect(validateRosterFile({ name: 'lop.csv', size: MAX_ROSTER_FILE_BYTES + 1 })).toContain('quá lớn');
    });
  });

  describe('lecturerLabel', () => {
    const names = new Map([['u1', 'gv.test01']]);

    it('dùng tên đăng nhập khi tra được', () => {
      expect(lecturerLabel('u1', names, 'me')).toBe('gv.test01');
    });

    it('hiện "Bạn" khi là người đang đăng nhập và không tra được tên', () => {
      expect(lecturerLabel('me', names, 'me')).toBe('Bạn');
    });

    it('không đoán tên: hiện mã ngắn khi không tra được', () => {
      expect(lecturerLabel('671dcba5f123456789abcd01', names, 'me')).toBe('GV …abcd01');
    });
  });
});
