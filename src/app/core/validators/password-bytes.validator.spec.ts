import { FormControl } from '@angular/forms';
import { passwordBytesValidator } from './password-bytes.validator';

const check = (value: string) => passwordBytesValidator(new FormControl(value));

describe('passwordBytesValidator - US-02/AC-1 (8 đến 72 byte UTF-8)', () => {
  it('ô trống để required xử lý', () => {
    expect(check('')).toBeNull();
  });

  it('7 byte quá ngắn, 8 byte hợp lệ (biên dưới)', () => {
    expect(check('abcdefg')).toEqual({ passwordTooShort: { bytes: 7 } });
    expect(check('abcdefgh')).toBeNull();
  });

  it('72 byte hợp lệ, 73 byte quá dài (biên trên)', () => {
    expect(check('a'.repeat(72))).toBeNull();
    expect(check('a'.repeat(73))).toEqual({ passwordTooLong: { bytes: 73 } });
  });

  it('đo theo byte chứ không theo ký tự: 25 chữ "ệ" chỉ 25 ký tự nhưng 75 byte', () => {
    expect('ệ'.repeat(25)).toHaveLength(25);
    expect(check('ệ'.repeat(24))).toBeNull(); // 72 byte
    expect(check('ệ'.repeat(25))).toEqual({ passwordTooLong: { bytes: 75 } });
  });

  it('4 ký tự có dấu 3 byte (12 byte) vẫn đủ độ dài tối thiểu dù ít hơn 8 ký tự', () => {
    expect(check('ệệệệ')).toBeNull();
  });
});
