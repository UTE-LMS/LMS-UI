import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { AuthService } from '@services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

/**
 * @link https://blog.angular.io/advancements-in-the-angular-router-5d69ec4c032
 */
export const canActiveGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  // Ngon ngu hien thi //////////
  const langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).CORE.GUARD;
  //////////////////////////////
  const authSvc = inject(AuthService);
  const routerSvc = inject(Router);
  const alertSvc = inject(ToastrService);
  const fallbackRedirectUrl: string = _route.data?.fallbackUrl ?? UrlConstant.ROUTE.AUTH.LOGIN;
  const rolesRelation: 'AND' | 'OR' = _route.data?.rolesRelation ?? 'OR';
  try {
    if (!_route.data?.listRoles) { // Không có list role thì ra vào tự do
      return of(true);
    } else if (authSvc.getAuthData() && authSvc.getToken()) { // Có listRole và có user data + token
      const allowedRoles: string[] = [_route.data.listRoles].flat();
      if (rolesRelation === 'AND') {
        if (allowedRoles.every(role => authSvc.checkRole(role))) {
          return of(true);
        } else {
          alertSvc.error(langData.TAI_KHOAN_KHONG_CO_QUYEN);
          routerSvc.navigateByUrl(fallbackRedirectUrl);
          return of(false);
        }
      } else { // OR
        if (allowedRoles.some(role => authSvc.checkRole(role))) {
          return of(true);
        } else {
          alertSvc.error(langData.TAI_KHOAN_KHONG_CO_QUYEN);
          routerSvc.navigateByUrl(fallbackRedirectUrl);
          return of(false);
        }
      }
    } else {
      alertSvc.error(langData.TAI_KHOAN_KHONG_CO_QUYEN);
      routerSvc.navigateByUrl(fallbackRedirectUrl);
      return of(false);
    }
  } catch (error) {
    console.log(error);
    alertSvc.error(langData.TAI_KHOAN_KHONG_CO_QUYEN);
    routerSvc.navigateByUrl(fallbackRedirectUrl);
    return of(false);
  }
};
