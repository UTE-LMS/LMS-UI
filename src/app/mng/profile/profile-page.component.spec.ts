import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePageComponent } from './profile-page.component';

describe('ProfilePageComponent (Tài khoản của tôi)', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let component: ProfilePageComponent;
  let authSvc: {
    getProfile: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
  };
  const toastStub = { success: vi.fn(), error: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    authSvc = {
      // DỮ LIỆU THỬ NGHIỆM
      getProfile: vi.fn(() => of({ id: 'u1', username: 'gv.test', email: '', fullName: 'Tên cũ', status: 'ACTIVE',
        roles: ['LECTURER'] })),
      logout: vi.fn(() => of(undefined)),
      updateProfile: vi.fn((model: { fullName: string; }) => of({ id: 'u1', username: 'gv.test', email: '',
        fullName: model.fullName, status: 'ACTIVE', roles: ['LECTURER'] })),
    };
    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSvc },
        { provide: ToastrService, useValue: toastStub },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProfilePageComponent);
    component = fixture.componentInstance;
  });

  it('đọc hồ sơ từ /auth/me và hiện vai trò', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(authSvc.getProfile).toHaveBeenCalled();
    expect(text).toContain('gv.test');
    expect(text).toContain('Chưa có');
  });

  it('ô họ tên được điền sẵn từ hồ sơ và nút Lưu bị khóa khi chưa sửa', () => {
    fixture.detectChanges();
    expect(component.nameForm.getRawValue().fullName).toBe('Tên cũ');
    expect(component.nameForm.pristine).toBe(true);
  });

  it('sửa họ tên: gửi tên đã trim, cập nhật hồ sơ, báo thành công', () => {
    fixture.detectChanges();
    component.nameForm.controls.fullName.setValue('  Tên mới  ');
    component.onSaveName();
    expect(authSvc.updateProfile).toHaveBeenCalledWith({ fullName: 'Tên mới' });
    expect(component.profile()?.fullName).toBe('Tên mới');
    expect(component.nameForm.getRawValue().fullName).toBe('Tên mới');
    expect(toastStub.success).toHaveBeenCalled();
  });

  it('họ tên trống hoặc toàn dấu cách bị chặn ở client', () => {
    fixture.detectChanges();
    component.nameForm.controls.fullName.setValue('   ');
    component.onSaveName();
    expect(authSvc.updateProfile).not.toHaveBeenCalled();
    expect(component.nameForm.controls.fullName.touched).toBe(true);
  });

  it('họ tên quá 100 ký tự bị chặn ở client', () => {
    fixture.detectChanges();
    component.nameForm.controls.fullName.setValue('a'.repeat(101));
    component.onSaveName();
    expect(authSvc.updateProfile).not.toHaveBeenCalled();
  });

  it('backend trả lỗi 400: hiện thông báo, giữ tên đang nhập, không báo thành công', () => {
    fixture.detectChanges();
    authSvc.updateProfile.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { timestamp: 't', status: 400, code: 'VALIDATION_ERROR', message: 'Họ và tên tối đa 100 ký tự', path: '/api/v1/auth/me' },
    })));
    component.nameForm.controls.fullName.setValue('Tên mới');
    component.onSaveName();
    expect(component.nameErrorMsg()).toBe('Họ và tên tối đa 100 ký tự');
    expect(component.nameForm.getRawValue().fullName).toBe('Tên mới');
    expect(toastStub.success).not.toHaveBeenCalled();
    expect(component.savingName()).toBe(false);
  });

  it('hiện mục đổi mật khẩu dùng form dùng chung', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-change-password-form')).not.toBeNull();
  });

  it('lỗi 401 hiện trạng thái lỗi', () => {
    authSvc.getProfile.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    fixture.detectChanges();
    expect(component.error()?.kind).toBe('UNAUTHORIZED');
  });

  it('đăng xuất rồi chuyển về trang đăng nhập', () => {
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.logout();
    expect(authSvc.logout).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith('/auth/login');
  });
});
