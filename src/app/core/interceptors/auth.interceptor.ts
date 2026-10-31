import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { environment } from '@env';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { AuthService } from '@services/auth/auth.service';
import { HandlerErrorService } from '@services/common/handler-error.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { INLINE_ERRORS } from './http-context.token';
import { catchError, finalize } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const handleErrSvc = inject(HandlerErrorService);
  const authSvc = inject(AuthService);
  const spinner = inject(NgxSpinnerService);
  const alert = inject(ToastrService);

  // Ngon ngu hien thi //////////
  const langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).APP;
  //////////////////////////////

  // Check in-app WebView
  if (SystemConstant.WEBVIEW_UA.some(x => window.navigator.userAgent.includes(x))
    && window.location.pathname !== '/') {
    alert.warning(langData['CANH_BAO_WEBVIEW'], undefined, {
      timeOut: 30000, extendedTimeOut: 3000, tapToDismiss: true,
      enableHtml: true, positionClass: 'toast-top-center-fw',
    });
  }

  const addHeaderData = (
    request: HttpRequest<unknown>,
    options: {
      addBugTrackerToken?: boolean;
      addLanguage?: boolean;
      bypassNgSw?: boolean;
      addToken?: boolean;
    },
  ): HttpRequest<unknown> => {
    const header: Record<string, string | string[]> = {};
    if (options.addBugTrackerToken) {
      // header['x-st'] = environment.sentryToken;
    }
    if (options.addLanguage) {
      header['Accept-Language'] = localStorage.getItem('language') === 'vi' ? 'vn' : 'en';
    }
    if (options.bypassNgSw) {
      header['ngsw-bypass'] = '1';
    }
    if (options.addToken) {
      header.Authorization = `Bearer ${authSvc.getToken()}`;
    }
    return request.clone({
      setHeaders: header,
    });
  };

  let newRequest: HttpRequest<unknown> = addHeaderData(request, {
    addBugTrackerToken: true, addLanguage: true,
  });

  // Mã truy vết gửi lên backend để đối chiếu log khi có lỗi 500 (API-CONTRACT.md §1.4)
  if (request.url.startsWith(environment.serverUrl + 'api/')) {
    newRequest = newRequest.clone({ setHeaders: { 'X-Correlation-Id': crypto.randomUUID() } });
  }

  if (UrlConstant.GOOGLE_URL.some(
    x => x.method === request.method &&
      new RegExp(x.regex).test(request.url),
  )) {
    newRequest = addHeaderData(request, {});
  }

  if (UrlConstant.BYPASS_NGSW_URL.some(
    x => x.method === request.method &&
      new RegExp(x.regex).test(request.url),
  )) {
    newRequest = addHeaderData(newRequest, { bypassNgSw: true });
  }

  if (UrlConstant.PUBLIC_URL.some(
    x => x.method === request.method &&
      new RegExp(x.regex).test(request.url),
  )) {
    // go to return
  } else if (authSvc.getAuthData() && authSvc.getToken()) {
    newRequest = addHeaderData(newRequest, { addToken: true });
  }

  spinner.show();
  return next(newRequest)
    .pipe(
      finalize(() => { spinner.hide(); }),
      catchError(
        (err: HttpErrorResponse) => new Observable<HttpEvent<unknown>>(observer => {
          handleErrSvc.handleError(err, { inline: request.context.get(INLINE_ERRORS) });
          observer.error(err);
          observer.complete();
        }),
      ),
    );
};
