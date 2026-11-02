import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { IAuthData } from '@models/auth/auth.model';
import { AuthService } from '@services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Observable } from 'rxjs';
import { canActiveGuard } from './can-active.guard';

interface AuthStub {
  getAuthData: ReturnType<typeof vi.fn>;
  getToken: ReturnType<typeof vi.fn>;
  checkRole: ReturnType<typeof vi.fn>;
}

function setup(options: { loggedIn: boolean; roles?: string[]; }) {
  const roles = options.roles ?? [];
  const auth: AuthStub = {
    getAuthData: vi.fn(() => (options.loggedIn ? ({ roles } as IAuthData) : null)),
    getToken: vi.fn(() => (options.loggedIn ? 'token-gia' : '')),
    checkRole: vi.fn((role: string) => roles.includes(role)),
  };
  const router = { navigateByUrl: vi.fn() };
  const toastr = { error: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
      { provide: ToastrService, useValue: toastr },
    ],
  });
  const injector = TestBed.inject(EnvironmentInjector);
  const run = (data?: Record<string, unknown>): Promise<boolean> => {
    const route = { data } as unknown as ActivatedRouteSnapshot;
    const result = runInInjectionContext(
      injector,
      () => canActiveGuard(route, {} as RouterStateSnapshot),
    );
    return firstValueFrom(result as Observable<boolean>);
  };
  return { run, router, toastr, auth };
}

describe('US-03/AC-2: canActiveGuard từ chối khi chưa xác thực', () => {
  beforeEach(() => localStorage.clear());

  it('route không khai báo listRoles thì cho vào tự do (ca biên)', async () => {
    const { run, router } = setup({ loggedIn: false });
    expect(await run({})).toBe(true);
    expect(await run(undefined)).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('có listRoles nhưng chưa đăng nhập: chặn, báo lỗi và chuyển về trang đăng nhập', async () => {
    const { run, router, toastr } = setup({ loggedIn: false });
    expect(await run({ listRoles: ['ROLE_ADMIN'] })).toBe(false);
    expect(toastr.error).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith(UrlConstant.ROUTE.AUTH.LOGIN);
  });

  it('chuyển về fallbackUrl của route khi có khai báo', async () => {
    const { run, router } = setup({ loggedIn: false });
    await run({ listRoles: ['ROLE_ADMIN'], fallbackUrl: '/forbidden' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/forbidden');
  });

  it('có token nhưng không có dữ liệu người dùng vẫn bị chặn', async () => {
    const { run, auth } = setup({ loggedIn: true, roles: ['ROLE_ADMIN'] });
    auth.getAuthData.mockReturnValue(null);
    expect(await run({ listRoles: ['ROLE_ADMIN'] })).toBe(false);
  });
});

describe('US-02/AC-4: canActiveGuard chặn người không đủ vai trò', () => {
  beforeEach(() => localStorage.clear());

  it('quan hệ OR (mặc định): đủ một trong các vai trò thì vào được', async () => {
    const { run, router } = setup({ loggedIn: true, roles: ['ROLE_ADMIN'] });
    expect(await run({ listRoles: ['ROLE_STUDENT', 'ROLE_ADMIN'] })).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('quan hệ OR: không có vai trò nào thì bị chặn (ca âm)', async () => {
    const { run, router, toastr } = setup({ loggedIn: true, roles: ['ROLE_STUDENT'] });
    expect(await run({ listRoles: ['ROLE_ADMIN'] })).toBe(false);
    expect(toastr.error).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith(UrlConstant.ROUTE.AUTH.LOGIN);
  });

  it('listRoles là chuỗi đơn cũng được hiểu như danh sách một phần tử', async () => {
    const { run } = setup({ loggedIn: true, roles: ['ROLE_ADMIN'] });
    expect(await run({ listRoles: 'ROLE_ADMIN' })).toBe(true);
  });

  it('quan hệ AND: phải đủ mọi vai trò', async () => {
    const { run } = setup({ loggedIn: true, roles: ['ROLE_ADMIN', 'ROLE_STUDENT'] });
    expect(await run({ listRoles: ['ROLE_ADMIN', 'ROLE_STUDENT'], rolesRelation: 'AND' })).toBe(true);
  });

  it('quan hệ AND: thiếu một vai trò thì bị chặn (ca biên)', async () => {
    const { run, router } = setup({ loggedIn: true, roles: ['ROLE_ADMIN'] });
    expect(await run({ listRoles: ['ROLE_ADMIN', 'ROLE_STUDENT'], rolesRelation: 'AND' })).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
  });

  it('lỗi bất ngờ khi kiểm tra vai trò: chặn thay vì cho qua (fail-closed)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { run, auth, router } = setup({ loggedIn: true, roles: ['ROLE_ADMIN'] });
    auth.checkRole.mockImplementation(() => {
      throw new Error('Dữ liệu hỏng');
    });
    expect(await run({ listRoles: ['ROLE_ADMIN'] })).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith(UrlConstant.ROUTE.AUTH.LOGIN);
    logSpy.mockRestore();
  });
});
