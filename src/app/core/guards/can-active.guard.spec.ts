import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';
import { canActiveGuard } from './can-active.guard';

describe('canActiveGuard', () => {
  let router: Router;
  let authenticated = false;
  let roles: string[] = [];

  const authStub = {
    isAuthenticated: () => authenticated,
    checkRole: (role: string) => roles.includes(role),
  };

  const run = (data: Record<string, unknown>, url = '/mng/users') => TestBed.runInInjectionContext(() => canActiveGuard({ data } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));

  beforeEach(() => {
    authenticated = false;
    roles = [];
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    });
    router = TestBed.inject(Router);
  });

  it('chưa đăng nhập: về trang đăng nhập kèm returnUrl', () => {
    const result = run({ listRoles: ['ADMIN'] });
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe(`${UrlConstant.ROUTE.AUTH.LOGIN}?returnUrl=%2Fmng%2Fusers`);
  });

  it('đã đăng nhập nhưng thiếu vai trò: sang trang "Không có quyền", không về đăng nhập', () => {
    authenticated = true;
    roles = ['LECTURER'];
    const result = run({ listRoles: ['ADMIN'] });
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe(UrlConstant.ROUTE.MANAGEMENT.FORBIDDEN);
  });

  it('đúng vai trò: cho vào', () => {
    authenticated = true;
    roles = ['ADMIN'];
    expect(run({ listRoles: ['ADMIN'] })).toBe(true);
  });

  it('không khai báo listRoles: chỉ cần đã đăng nhập', () => {
    authenticated = true;
    expect(run({})).toBe(true);
  });

  it('rolesRelation OR: một trong các vai trò là đủ', () => {
    authenticated = true;
    roles = ['VIEWER'];
    expect(run({ listRoles: ['ADMIN', 'VIEWER'], rolesRelation: 'OR' })).toBe(true);
  });

  it('rolesRelation AND: thiếu một vai trò là bị chặn', () => {
    authenticated = true;
    roles = ['ADMIN'];
    const result = run({ listRoles: ['ADMIN', 'VIEWER'], rolesRelation: 'AND' });
    expect(result).toBeInstanceOf(UrlTree);
  });

  it('dùng fallbackUrl riêng khi route khai báo', () => {
    authenticated = true;
    const result = run({ listRoles: ['ADMIN'], fallbackUrl: '/mng/dashboard' });
    expect(router.serializeUrl(result as UrlTree)).toBe('/mng/dashboard');
  });
});
