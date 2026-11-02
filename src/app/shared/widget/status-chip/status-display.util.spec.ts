import { SCORE_STATUS_DISPLAY } from '@constants/measurement-display.constant';
import { resolveStatusDisplay, truncateText } from './status-display.util';

describe('resolveStatusDisplay - tra bảng hiển thị an toàn', () => {
  it('giá trị hợp lệ trả đúng mục trong bảng', () => {
    const result = resolveStatusDisplay(SCORE_STATUS_DISPLAY, 'MISSING');
    expect(result.known).toBe(true);
    expect(result.display).toBe(SCORE_STATUS_DISPLAY.MISSING);
  });

  it.each([null, undefined, '', '   '])('thiếu giá trị (%j): "Chưa có trạng thái", không hợp lệ', raw => {
    const result = resolveStatusDisplay(SCORE_STATUS_DISPLAY, raw);
    expect(result.known).toBe(false);
    expect(result.display.label).toBe('Chưa có trạng thái');
  });

  it('enum lạ: "Không xác định", nêu giá trị lạ trong chú thích và không bao giờ là số 0', () => {
    const result = resolveStatusDisplay(SCORE_STATUS_DISPLAY, 'PARTIALLY_GRADED');
    expect(result.known).toBe(false);
    expect(result.display.label).toBe('Không xác định');
    expect(result.display.description).toContain('PARTIALLY_GRADED');
    expect(result.display.label).not.toMatch(/\b0\b/);
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])('khóa của Object.prototype "%s" không được coi là hợp lệ', raw => {
    expect(resolveStatusDisplay(SCORE_STATUS_DISPLAY, raw).known).toBe(false);
  });

  it('không phân biệt hoa thường sai: "scored" (chữ thường) là giá trị lạ, không tự đoán', () => {
    expect(resolveStatusDisplay(SCORE_STATUS_DISPLAY, 'scored').known).toBe(false);
  });

  it('kiểu không phải chuỗi (số 0, object) cũng là giá trị lạ', () => {
    expect(resolveStatusDisplay(SCORE_STATUS_DISPLAY, 0).known).toBe(false);
    expect(resolveStatusDisplay(SCORE_STATUS_DISPLAY, {}).known).toBe(false);
    expect(resolveStatusDisplay(SCORE_STATUS_DISPLAY, {}).display.description).not.toContain('[object');
  });

  it('giá trị lạ rất dài bị rút gọn trong chú thích', () => {
    const result = resolveStatusDisplay(SCORE_STATUS_DISPLAY, 'X'.repeat(5000));
    expect(result.display.description.length).toBeLessThan(300);
    expect(result.display.description).toContain('…');
  });
});

describe('truncateText', () => {
  it('giữ nguyên chuỗi ngắn, gộp khoảng trắng', () => {
    expect(truncateText('  a   b\n c ', 20)).toBe('a b c');
  });

  it('cắt chuỗi dài đúng độ dài kể cả dấu …', () => {
    const result = truncateText('abcdefghij', 5);
    expect(result).toBe('abcd…');
    expect(result).toHaveLength(5);
  });

  it('chuỗi đúng bằng giới hạn không bị cắt', () => {
    expect(truncateText('abcde', 5)).toBe('abcde');
  });
});
