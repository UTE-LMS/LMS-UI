import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { FacultyService } from '@services/faculty/faculty.service';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePageComponent } from './profile-page.component';

describe('ProfilePageComponent (Tài khoản của tôi)', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let component: ProfilePageComponent;
  let authSvc: { getProfile: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn>; };
  let facultySvc: { getFacultyById: ReturnType<typeof vi.fn>; };

  beforeEach(async () => {
    authSvc = {
      // DỮ LIỆU THỬ NGHIỆM
      getProfile: vi.fn(() => of({ id: 'u1', username: 'gv.test', email: '', fullName: '', status: 'ACTIVE',
        roles: ['LECTURER'] })),
      logout: vi.fn(() => of(undefined)),
    };
    facultySvc = {
      getFacultyById: vi.fn(() => of({ id: 'fac_fit_01', code: 'FIT', name: 'Khoa Công nghệ Thông tin', isActive: true })),
    };
    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSvc },
        { provide: FacultyService, useValue: facultySvc },
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

  it('tra cứu tên Khoa cho hồ sơ PROGRAM_MANAGER chỉ có facultyId', () => {
    authSvc.getProfile.mockReturnValue(of({
      id: 'pm1',
      username: 'pm.fit',
      email: 'pm.fit@hcmute.edu.vn',
      fullName: 'Quản lý CTĐT',
      status: 'ACTIVE',
      facultyId: 'fac_fit_01',
      roles: ['PROGRAM_MANAGER'],
    }));
    fixture.detectChanges();
    expect(facultySvc.getFacultyById).toHaveBeenCalledWith('fac_fit_01');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('FIT - Khoa Công nghệ Thông tin');
  });
});
