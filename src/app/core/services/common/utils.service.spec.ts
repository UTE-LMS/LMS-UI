import { TestBed } from '@angular/core/testing';
import { UtilsService } from './utils.service';

function createService(): UtilsService {
  localStorage.removeItem('language');
  return TestBed.inject(UtilsService);
}

describe('NT-UI/AC-4: UtilsService', () => {
  describe('removeVietnameseUnicode / transformUtf8ToAscii', () => {
    it('bỏ dấu tiếng Việt cả chữ hoa lẫn chữ thường, đ/Đ thành d/D', () => {
      const service = createService();
      expect(service.removeVietnameseUnicode('Chuẩn đầu ra CTĐT')).toBe('Chuan dau ra CTDT');
      expect(service.removeVietnameseUnicode('ƯỚC LƯỢNG Ỹ')).toBe('UOC LUONG Y');
    });

    it('chuỗi rỗng/null trả về chuỗi rỗng (ca biên)', () => {
      const service = createService();
      expect(service.removeVietnameseUnicode('')).toBe('');
      expect(service.removeVietnameseUnicode(null as unknown as string)).toBe('');
    });

    it('tạo slug: chữ thường, bỏ ký tự đặc biệt, khoảng trắng thành gạch nối, gộp gạch nối liên tiếp', () => {
      const service = createService();
      expect(service.transformUtf8ToAscii('Chuẩn đầu ra CTĐT!')).toBe('chuan-dau-ra-ctdt');
      expect(service.transformUtf8ToAscii('a  -  b')).toBe('a-b');
    });
  });

  describe('daysAmountToText', () => {
    it.each([
      [5, '5 ngày trước'],
      [30, '30 ngày trước'],
      [31, '1 tháng trước'],
      [45, '1 tháng trước'],
      [365, '12 tháng trước'],
      [366, '1 năm trước'],
      [800, '2 năm trước'],
      [0, '0 ngày trước'],
    ])('số ngày dương %i -> "%s"', (days, expected) => {
      expect(createService().daysAmountToText(days)).toBe(expected);
    });

    it.each([
      [-5, '5 ngày'],
      [-45, '1 tháng'],
      [-800, '2 năm'],
    ])('số ngày âm %i dùng cách nói không có "trước" -> "%s"', (days, expected) => {
      expect(createService().daysAmountToText(days)).toBe(expected);
    });
  });

  describe('readNumberAsText (tiếng Việt)', () => {
    it('số 0 đọc là "Không" kèm hậu tố', () => {
      const service = createService();
      expect(service.readNumberAsText(0, 'đồng')).toBe('Không đồng');
    });

    it('NaN trả về chuỗi rỗng (ca âm)', () => {
      expect(createService().readNumberAsText(Number.NaN)).toBe('');
    });

    it.each([
      [5, 'Năm'],
      [21, 'Hai mươi mốt'],
      [1000, 'Một nghìn'],
      [1205, 'Một nghìn hai trăm lẻ năm'],
    ])('đọc %i thành "%s"', (num, expected) => {
      expect(createService().readNumberAsText(num)).toBe(expected);
    });

    it('thêm hậu tố đơn vị vào cuối', () => {
      expect(createService().readNumberAsText(5, 'đồng')).toBe('Năm đồng');
    });
  });
});
