import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { AuthService } from '@services/auth/auth.service';

/**
 * Chặn route theo phiên đăng nhập và vai trò. Chỉ để tiện dùng: quyền thật do backend kiểm tra
 * mỗi request, gõ thẳng đường dẫn vẫn bị API trả 403 (API-CONTRACT.md §3, rule 02).
 *
 * route.data:
 * - listRoles: vai trò được vào. Bỏ trống thì chỉ cần đã đăng nhập.
 * - rolesRelation: 'OR' (mặc định) cần một trong các vai trò, 'AND' cần đủ.
 * - fallbackUrl: nơi đưa người dùng đã đăng nhập nhưng thiếu quyền (mặc định trang "Không có quyền").
 *
 * Chưa đăng nhập: về trang đăng nhập kèm returnUrl. Đã đăng nhập nhưng thiếu quyền: trang "Không có quyền",
 * không đá về đăng nhập vì người dùng đã xác thực.
 */
export const canActiveGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree => {
  const authSvc = inject(AuthService);
  const router = inject(Router);

  if (!authSvc.isAuthenticated()) {
    return router.createUrlTree([UrlConstant.ROUTE.AUTH.LOGIN], { queryParams: { returnUrl: state.url } });
  }

  const allowedRoles: string[] = [(route.data?.listRoles ?? []) as string | string[]].flat();
  const relation: 'AND' | 'OR' = route.data?.rolesRelation ?? 'OR';
  const isAllowed = allowedRoles.length === 0
    || (relation === 'AND'
      ? allowedRoles.every(role => authSvc.checkRole(role))
      : allowedRoles.some(role => authSvc.checkRole(role)));

  if (isAllowed) {
    return true;
  }
  const fallbackUrl: string = route.data?.fallbackUrl ?? UrlConstant.ROUTE.MANAGEMENT.FORBIDDEN;
  return router.parseUrl(fallbackUrl);
};
