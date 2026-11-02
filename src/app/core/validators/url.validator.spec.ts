import { FormControl } from '@angular/forms';
import { urlValidator } from './url.validator';

describe('NT-UI/AC-1: urlValidator', () => {
  it('bỏ qua giá trị rỗng/null (ca biên)', () => {
    expect(urlValidator()(new FormControl(''))).toBeNull();
    expect(urlValidator('example.com')(new FormControl(null))).toBeNull();
  });

  it('không giới hạn tên miền: chỉ cần bắt đầu bằng http/https', () => {
    expect(urlValidator()(new FormControl('https://example.org/a?b=1'))).toBeNull();
    expect(urlValidator()(new FormControl('http://x'))).toBeNull();
  });

  it('không giới hạn tên miền: từ chối chuỗi không có giao thức', () => {
    const result = urlValidator()(new FormControl('example.org'));
    expect(result).toEqual({ invalidUrl: { valid: false, value: 'example.org' } });
  });

  it('giới hạn tên miền: chấp nhận tên miền chính, miền con và đường dẫn', () => {
    const validator = urlValidator('example.com');
    expect(validator(new FormControl('https://example.com'))).toBeNull();
    expect(validator(new FormControl('https://www.example.com/path/to'))).toBeNull();
  });

  it('giới hạn tên miền: từ chối tên miền khác (ca âm)', () => {
    const validator = urlValidator('example.com');
    expect(validator(new FormControl('https://example.org/path'))).not.toBeNull();
    expect(validator(new FormControl('https://notexample.com/path'))).not.toBeNull();
  });

  it('dấu chấm trong tên miền được coi là ký tự chấm thật, không phải ký tự bất kỳ', () => {
    expect(urlValidator('example.com')(new FormControl('https://exampleXcom'))).not.toBeNull();
  });
});
