import { ActivatedRouteSnapshot, CanDeactivateFn, RouterStateSnapshot } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { Observable, of } from 'rxjs';

/*
  USE:
  Firstly, declair canDeactivate in route config.
  Next, declair function at component using this guard:
    canDeactivate(): Observable<boolean> | Promise<boolean> | boolean
  If function not found, this guard will be skipped.

  To prevent page reload, you need use:
  @HostListener('window:beforeunload')
  beforeUnloadHander(e: BeforeUnloadEvent) {
    const confirmationMessage = '-';
    e.returnValue = confirmationMessage;
    return confirmationMessage;
  }
*/
/**
 * @link https://blog.angular.io/advancements-in-the-angular-router-5d69ec4c032
 */
export const canDeactivate: CanDeactivateFn<AComponent> = (
  _component: AComponent,
  _currentRoute: ActivatedRouteSnapshot,
  _currentState: RouterStateSnapshot,
  _nextState: RouterStateSnapshot,
): Observable<boolean> | Promise<boolean> | boolean => {
  // const authSvc = inject(AuthService);
  if (_nextState.url === UrlConstant.ROUTE.AUTH.LOGIN/*&& authSvc.checkTokenExpired()*/) {
    return of(true);
  } else {
    return _component.canDeactivate ? _component.canDeactivate() : of(true);
  }
};

export interface AComponent {
  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean;
}
