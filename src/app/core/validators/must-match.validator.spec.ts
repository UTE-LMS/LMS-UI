import { FormControl, FormGroup } from '@angular/forms';
import { mustMatch } from './must-match.validator';

function passwordForm(password: string, confirm: string): FormGroup {
  return new FormGroup(
    { password: new FormControl(password), confirm: new FormControl(confirm) },
    { validators: mustMatch('password', 'confirm') },
  );
}

describe('NT-UI/AC-1: mustMatch', () => {
  it('hai giá trị khác nhau gắn lỗi mustMatch lên control thứ hai', () => {
    const form = passwordForm('Abcd1234', 'Abcd12345');
    expect(form.get('confirm')?.errors).toEqual({ mustMatch: true });
  });

  it('hai giá trị giống nhau thì không có lỗi', () => {
    const form = passwordForm('Abcd1234', 'Abcd1234');
    expect(form.get('confirm')?.errors).toBeNull();
  });

  it('lỗi được gỡ khi người dùng sửa cho khớp', () => {
    const form = passwordForm('Abcd1234', 'x');
    form.get('confirm')?.setValue('Abcd1234');
    expect(form.get('confirm')?.errors).toBeNull();
  });

  it('không ghi đè lỗi khác đã có sẵn trên control thứ hai (ví dụ required)', () => {
    const form = new FormGroup(
      { password: new FormControl('a'), confirm: new FormControl('') },
      { validators: mustMatch('password', 'confirm') },
    );
    form.get('confirm')?.setErrors({ required: true });
    form.updateValueAndValidity();
    expect(form.get('confirm')?.errors).toEqual({ required: true });
  });

  it('tên control không tồn tại: ghi log lỗi và không ném ngoại lệ (ca âm)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const form = new FormGroup({ password: new FormControl('a') });
    expect(mustMatch('password', 'missing')(form)).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
