import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { CORRELATION_ID_LABEL, ERROR_MESSAGE } from '@constants/error-message.constant';
import { UrlConstant } from '@constants/url.constant';
import { environment } from '@env';
import { IBugsReportDTO } from '@models/common/bugs-report.model';
import { IUserError } from '@models/common/user-error.model';
import { AuthService } from '@services/auth/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { toApiError, toUserError } from './api-error.util';
import { BugsReportService } from './bugs-report.service';

export interface IHandleErrorOptions {
  /** Màn hình tự hiển thị lỗi 4xx (trừ 403): bỏ qua toast và đá về đăng nhập. Xem INLINE_ERRORS. */
  inline?: boolean;
}

/**
 * Xử lý lỗi HTTP tập trung theo bảng ánh xạ ở API-CONTRACT.md §3, dùng toUserError để không lộ chi tiết nội bộ.
 * Quyền thật do backend kiểm tra: ở đây chỉ chọn cách báo lỗi cho người dùng.
 * Nút "Thử lại"/"Tải lại" nằm ở màn hình (component app-error-state), vì toast không biết cách tải lại dữ liệu.
 */
@Injectable({
  providedIn: 'root',
})
export class HandlerErrorService {
  private authSvc = inject(AuthService);
  private alert = inject(ToastrService);
  private spinner = inject(NgxSpinnerService);
  private bugsReportSvc = inject(BugsReportService);
  private router = inject(Router);

  /** Nhiều yêu cầu song song cùng nhận 401: chỉ xóa phiên và chuyển hướng một lần. */
  private sessionExpiring = false;

  handleError(error: HttpErrorResponse, options: IHandleErrorOptions = {}): Observable<never> {
    // Tránh vòng lặp vô tận nếu chính API report bị lỗi
    if (error.url && (error.url.includes('script.google.com') || (environment.bugsReportUrl && error.url.includes(environment.bugsReportUrl)))) {
      this.spinner.hide();
      return throwError(() => new Error(ERROR_MESSAGE.UNKNOWN.message));
    }

    try {
      this.notify(error, options.inline ?? false);
    } catch {
      this.alert.error(ERROR_MESSAGE.UNKNOWN.message);
    }

    this.spinner.hide();
    return throwError(() => new Error(ERROR_MESSAGE.UNKNOWN.message));
  }

  private notify(error: HttpErrorResponse, inline: boolean): void {
    const userError = toUserError(error);

    switch (userError.kind) {
      case 'NETWORK':
      case 'TIMEOUT': // Mất mạng hoặc hết thời gian: không đăng xuất người dùng vì một lần rớt mạng
        this.alert.error(userError.hint ? `${userError.message} ${userError.hint}` : userError.message);
        return;
      case 'FORBIDDEN': // Đã đăng nhập nhưng không đủ quyền: KHÔNG chuyển về đăng nhập
        this.alert.error(userError.message);
        return;
      case 'SERVER':
        this.notifyServerError(error, userError);
        return;
      case 'UNKNOWN':
        this.alert.error(userError.message);
        return;
      default:
        break;
    }

    // Đăng nhập sai (401 của chính endpoint đăng nhập) luôn do form đăng nhập hiển thị, không bao giờ hết phiên.
    if (inline || this.isLoginRequest(error)) { // Màn hình sẽ tự hiển thị 400/401/404/409/422 ngay tại form
      return;
    }

    switch (userError.kind) {
      case 'UNAUTHORIZED':
        this.expireSession(userError.message);
        break;
      case 'BUSINESS_RULE':
        this.alert.error(userError.message);
        break;
      case 'CONFLICT': // Không ghi đè im lặng: báo và gợi ý tải lại
        this.alert.warning(userError.hint ? `${userError.message} ${userError.hint}` : userError.message);
        break;
      default: // 400, 404 và các 4xx khác
        this.alert.warning(userError.message);
        break;
    }
  }

  private notifyServerError(error: HttpErrorResponse, userError: IUserError): void {
    this.alert.error(
      userError.correlationId ? `${CORRELATION_ID_LABEL}: ${userError.correlationId}` : '',
      userError.message,
    );
    if (!isDevMode()) {
      this.submitBugsReport(`[${error.status}] ${userError.correlationId ?? ''} ${toApiError(error)?.path ?? ''}`);
    }
  }

  private isLoginRequest(error: HttpErrorResponse): boolean {
    return !!error.url && error.url.startsWith(UrlConstant.API.AUTH_LOGIN);
  }

  private expireSession(message: string): void {
    if (this.sessionExpiring) {
      return;
    }
    this.sessionExpiring = true;
    const returnUrl = this.router.url;
    this.authSvc.clearSession();
    this.alert.warning(message);
    if (returnUrl.startsWith(UrlConstant.ROUTE.AUTH.LOGIN)) {
      this.sessionExpiring = false;
      return;
    }
    void Promise.resolve(this.router.navigate([UrlConstant.ROUTE.AUTH.LOGIN], { queryParams: { returnUrl } }))
      .finally(() => { this.sessionExpiring = false; });
  }

  handleErrorForkJoin(): Observable<unknown> {
    return of([]);
  }

  submitBugsReport(errorString: string): void {
    const bugReportData: IBugsReportDTO = {
      errorDomain: window.location.hostname,
      errorUrl: window.location.href,
      ua: window.navigator.userAgent,
      errorInfo: errorString,
      otherInfo: '',
      email: '',
    };
    this.bugsReportSvc.submitBugsReport(bugReportData).subscribe({
      error: () => {
        // Reporting errors are handled locally to avoid an unhandled observable error.
      },
    });
  }
}
