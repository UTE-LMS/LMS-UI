import { FormControl } from '@angular/forms';
import { customDateValidator } from './date.validator';

function dirtyControl(value: unknown): FormControl {
  const control = new FormControl(value);
  control.markAsDirty();
  return control;
}

describe('NT-UI/AC-1: customDateValidator (dd/MM/yyyy)', () => {
  it('control pristine không bị báo lỗi', () => {
    expect(customDateValidator(new FormControl('99/99/9999'))).toBeNull();
  });

  it('giá trị rỗng/không phải chuỗi thì bỏ qua (ca biên)', () => {
    expect(customDateValidator(dirtyControl(''))).toBeNull();
    expect(customDateValidator(dirtyControl(null))).toBeNull();
  });

  it.each(['01/02/2026', '1-2-2026', '31/12/2026', '29/02/2028 23:59:59'])('chấp nhận "%s"', (value) => {
    expect(customDateValidator(dirtyControl(value))).toBeNull();
  });

  it.each(['32/01/2026', '00/01/2026', '01/13/2026', '2026/01/01', '01/01/26', '01/01-2026'])(
    'từ chối "%s" bằng lỗi invalidDate (ca âm/biên)',
    (value) => {
      expect(customDateValidator(dirtyControl(value))).toEqual({ invalidDate: value });
    },
  );

  it('từ chối giờ ngoài khoảng 0-23', () => {
    expect(customDateValidator(dirtyControl('01/01/2026 24:00:00'))).not.toBeNull();
  });
});
