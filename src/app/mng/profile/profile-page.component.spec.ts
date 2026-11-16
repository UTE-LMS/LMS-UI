import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePageComponent } from './profile-page.component';

describe('ProfilePageComponent (Tài khoản của tôi)', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let component: ProfilePageComponent;
  let authSvc: { getProfile: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn>; };

  beforeEach(async () => {
    authSvc = {
      // DỮ LIỆU THỬ NGHIỆM
      getProfile: vi.fn(() => of({ id: 'u1', username: 'gv.test', email: '', fullName: '', status: 'ACTIVE',
        roles: ['LECTURER'] })),
      logout: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authSvc }],
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
