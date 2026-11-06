import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { of } from 'rxjs';
import { ManagementHeaderComponent } from './management-header.component';

describe('ManagementHeaderComponent (Header Admin Layout)', () => {
  let fixture: ComponentFixture<ManagementHeaderComponent>;
  let component: ManagementHeaderComponent;
  let router: Router;

  const authSvc = {
    getUsername: vi.fn(() => 'admin'),
    getNameOfLogin: vi.fn(() => 'Quản trị viên Hệ thống'),
    getRoles: vi.fn(() => [SystemConstant.ROLE.ADMIN]),
    getAvatarOfLogin: vi.fn(() => ''),
    logout: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    authSvc.getUsername.mockReturnValue('admin');
    authSvc.getNameOfLogin.mockReturnValue('Quản trị viên Hệ thống');
    authSvc.getRoles.mockReturnValue([SystemConstant.ROLE.ADMIN]);
    authSvc.logout.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [ManagementHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSvc },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockReturnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(ManagementHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo thành công', () => {
    expect(component).toBeTruthy();
  });

  it('hiển thị logo trường từ assets và tiêu đề OBE', () => {
    const el = fixture.nativeElement as HTMLElement;
    const logoImg = el.querySelector('img.header-logo') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toBe('assets/img/logo/ute_logo.png');

    const brand = el.querySelector('.brand-title');
    expect(brand?.textContent?.trim()).toBe('OBE');
  });

  it('chỉ hiển thị các chức năng đang có trong hệ thống từ menu chức năng', () => {
    const navItems = component.visibleNavItems();
    const titles = navItems.map(i => i.title);

    // ADMIN có đủ các mục được phân quyền
    expect(titles).toContain('Tổng quan');
    expect(titles).toContain('Người dùng');
    expect(titles).toContain('Danh mục CTĐT');
    expect(titles).toContain('Khung CTĐT & Chuẩn đầu ra');

    // Không chứa các chức năng chưa triển khai
    expect(titles).not.toContain('Lớp học');
    expect(titles).not.toContain('Đánh giá');
    expect(titles).not.toContain('Điểm');
    expect(titles).not.toContain('Báo cáo');
  });

  it('người dùng không phải ADMIN thì không thấy mục Người dùng và Danh mục CTĐT', () => {
    component.roles.set([SystemConstant.ROLE.LECTURER]);
    fixture.detectChanges();

    const titles = component.visibleNavItems().map(i => i.title);
    expect(titles).not.toContain('Người dùng');
    expect(titles).not.toContain('Danh mục CTĐT');
    expect(titles).toContain('Tổng quan');
    expect(titles).toContain('Khung CTĐT & Chuẩn đầu ra');
  });

  it('hiển thị đúng chữ cái viết tắt vai trò (QT cho ADMIN, QL cho PROGRAM_MANAGER)', () => {
    component.roles.set([SystemConstant.ROLE.ADMIN]);
    expect(component.roleBadgeText()).toBe('QT');

    component.roles.set([SystemConstant.ROLE.PROGRAM_MANAGER]);
    expect(component.roleBadgeText()).toBe('QL');

    component.roles.set([SystemConstant.ROLE.LECTURER]);
    expect(component.roleBadgeText()).toBe('GV');
  });

  it('bấm Đăng xuất thì gọi authSvc.logout và chuyển về trang đăng nhập', () => {
    component.doLogout();
    expect(authSvc.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith(UrlConstant.ROUTE.AUTH.LOGIN);
  });
});
