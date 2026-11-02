import { ActivatedRouteSnapshot, GuardResult, MaybeAsync, RouterStateSnapshot } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { AComponent, canDeactivate } from './deactivate.guard';

const route = {} as ActivatedRouteSnapshot;
const current = {} as RouterStateSnapshot;

function next(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

async function resolve(result: MaybeAsync<GuardResult>): Promise<GuardResult> {
  return isObservable(result) ? firstValueFrom(result) : result;
}

describe('NT-UI/AC-2: canDeactivate (bảo vệ dữ liệu chưa lưu khi rời trang)', () => {
  it('đi tới trang đăng nhập thì luôn cho rời, bỏ qua canDeactivate của component', async () => {
    const component: AComponent = { canDeactivate: vi.fn(() => false) };
    const result = canDeactivate(component, route, current, next(UrlConstant.ROUTE.AUTH.LOGIN));
    expect(await resolve(result)).toBe(true);
    expect(component.canDeactivate).not.toHaveBeenCalled();
  });

  it('component không cho rời (trả false) thì chặn điều hướng', async () => {
    const component: AComponent = { canDeactivate: () => false };
    expect(await resolve(canDeactivate(component, route, current, next('/mng/dashboard')))).toBe(false);
  });

  it('component cho rời (trả Observable true) thì cho điều hướng', async () => {
    const component: AComponent = { canDeactivate: () => of(true) };
    expect(await resolve(canDeactivate(component, route, current, next('/mng/dashboard')))).toBe(true);
  });

  it('component không cài canDeactivate thì bỏ qua guard (ca biên)', async () => {
    const component = {} as AComponent;
    expect(await resolve(canDeactivate(component, route, current, next('/x')))).toBe(true);
  });
});
