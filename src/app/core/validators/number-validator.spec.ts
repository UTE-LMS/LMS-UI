import { FormControl } from '@angular/forms';
import { numberValidator } from './number-validator';

function dirtyControl(value: unknown): FormControl {
  const control = new FormControl(value);
  control.markAsDirty();
  return control;
}

describe('NT-UI/AC-1: numberValidator', () => {
  it('control chưa chạm vào (pristine) không bị báo lỗi và không bị đánh dấu touched', () => {
    const control = new FormControl('abc');
    expect(numberValidator(control)).toBeNull();
    expect(control.touched).toBe(false);
  });

  it('giá trị rỗng/không phải chuỗi thì bỏ qua nhưng control được đánh dấu touched', () => {
    const control = dirtyControl('');
    expect(numberValidator(control)).toBeNull();
    expect(control.touched).toBe(true);
    expect(numberValidator(dirtyControl(12))).toBeNull();
  });

  it.each(['12', '-3.5', '1.5e3', '1e-2'])('chấp nhận "%s"', (value) => {
    expect(numberValidator(dirtyControl(value))).toBeNull();
  });

  it.each(['abc', '12a', '1,5', '--1'])('từ chối "%s" bằng lỗi invalidNumber (ca âm)', (value) => {
    expect(numberValidator(dirtyControl(value))).toEqual({ invalidNumber: true });
  });
});
