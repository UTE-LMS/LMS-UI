import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '@services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { ChangePasswordFormComponent } from './change-password-form.component';

const unprocessable = (message: string): HttpErrorResponse => new HttpErrorResponse({
  status: 422,
  error: { timestamp: 't', status: 422, code: 'BUSINESS_RULE_VIOLATION', message, path: '/api/v1/auth/change-password' },
});

describe('ChangePasswordFormComponent (F01 form đổi mật khẩu)', () => {
  let fixture: ComponentFixture<ChangePasswordFormComponent>;
  let component: ChangePasswordFormComponent;
  const authStub = {
    changePassword: vi.fn((): Observable<unknown> => of({})),
  };
  const toastStub = { success: vi.fn(), error: vi.fn() };

  const fill = (currentPassword: string, newPassword: string, confirmPassword: string): void => {
    component.form.setValue({ currentPassword, newPassword, confirmPassword });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    authStub.changePassword.mockImplementation(() => of({}));
    await TestBed.configureTestingModule({
      imports: [ChangePasswordFormComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: ToastrService, useValue: toastStub },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChangePasswordFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('form trống: không gọi API và đánh dấu các ô đã chạm', () => {
    component.onSubmit();
    expect(authStub.changePassword).not.toHaveBeenCalled();
    expect(component.form.controls.currentPassword.touched).toBe(true);
  });

  it('mật khẩu mới dưới 8 ký tự bị chặn ở client', () => {
    fill('Password123!', 'ngan', 'ngan');
    component.onSubmit();
    expect(authStub.changePassword).not.toHaveBeenCalled();
  });

  it('nhập lại mật khẩu không khớp bị chặn ở client', () => {
    fill('Password123!', 'MatKhauMoi456!', 'MatKhauKhac789!');
    component.onSubmit();
    expect(authStub.changePassword).not.toHaveBeenCalled();
  });

  it('hợp lệ: gửi mật khẩu hiện tại và mới (không gửi ô nhập lại), báo thành công, xóa trắng form và phát changed', () => {
    const changed = vi.fn();
    component.changed.subscribe(changed);
    fill('Password123!', 'MatKhauMoi456!', 'MatKhauMoi456!');
    component.onSubmit();
    expect(authStub.changePassword).toHaveBeenCalledWith({ currentPassword: 'Password123!', newPassword: 'MatKhauMoi456!' });
    expect(toastStub.success).toHaveBeenCalled();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(component.form.getRawValue()).toEqual({ currentPassword: '', newPassword: '', confirmPassword: '' });
  });

  it('lỗi 422 từ backend: hiện thông báo, giữ nguyên dữ liệu đã nhập, không phát changed', () => {
    const changed = vi.fn();
    component.changed.subscribe(changed);
    authStub.changePassword.mockImplementation(() => throwError(() => unprocessable('Mật khẩu hiện tại không chính xác')));
    fill('sai-mat-khau', 'MatKhauMoi456!', 'MatKhauMoi456!');
    component.onSubmit();
    expect(component.errorMsg()).toBe('Mật khẩu hiện tại không chính xác');
    expect(component.form.controls.newPassword.value).toBe('MatKhauMoi456!');
    expect(changed).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('gửi lại sau lỗi thì xóa thông báo lỗi cũ', () => {
    authStub.changePassword.mockImplementationOnce(() => throwError(() => unprocessable('Mật khẩu hiện tại không chính xác')));
    fill('sai-mat-khau', 'MatKhauMoi456!', 'MatKhauMoi456!');
    component.onSubmit();
    expect(component.errorMsg()).not.toBe('');
    fill('Password123!', 'MatKhauMoi456!', 'MatKhauMoi456!');
    component.onSubmit();
    expect(component.errorMsg()).toBe('');
  });
});
