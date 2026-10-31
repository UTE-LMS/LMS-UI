import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { ForbiddenComponent } from './forbidden.component';

const render = (auth: { getUsername: () => string; getRoles: () => string[]; }): string => {
  TestBed.configureTestingModule({
    imports: [ForbiddenComponent],
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
  });
  const fixture = TestBed.createComponent(ForbiddenComponent);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
};

describe('ForbiddenComponent (trang "Không có quyền")', () => {
  it('nêu tên tài khoản và vai trò bằng nhãn tiếng Việt, có lối về tổng quan', () => {
    const text = render({ getUsername: () => 'gv.oop01', getRoles: () => ['LECTURER'] });
    expect(text).toContain('Bạn không có quyền xem trang này');
    expect(text).toContain('Tài khoản gv.oop01 (Giảng viên)');
    expect(text).toContain('Về tổng quan');
  });

  it('vẫn hiển thị được khi không đọc được thông tin tài khoản', () => {
    const text = render({ getUsername: () => '', getRoles: () => [] });
    expect(text).toContain('Bạn không có quyền xem trang này');
    expect(text).not.toContain('Tài khoản  ');
  });
});
