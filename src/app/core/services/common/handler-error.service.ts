import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { UrlConstant } from '@constants/url.constant';
import { environment } from '@env';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { IBugsReportDTO } from '@models/common/bugs-report.model';
import { AuthService } from '@services/auth/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { toApiError } from './api-error.util';
import { BugsReportService } from './bugs-report.service';

export interface IHandleErrorOptions {
  /** Màn hình tự hiển thị lỗi 4xx (trừ 403): bỏ qua toast và đá về đăng nhập. Xem INLINE_ERRORS. */
  inline?: boolean;
}

/**
 * Xử lý lỗi HTTP tập trung theo bảng ánh xạ ở API-CONTRACT.md §3.
 * Quyền thật do backend kiểm tra: ở đây chỉ chọn cách báo lỗi cho người dùng.
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

  // Ngon ngu hien thi //////////
  private langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).CORE.HANDLE_ERROR;
  //////////////////////////////

  handleError(error: HttpErrorResponse, options: IHandleErrorOptions = {}): Observable<never> {
    // Tránh vòng lặp vô tận nếu chính API report bị lỗi
    if (error.url && (error.url.includes('script.google.com') || (environment.bugsReportUrl && error.url.includes(environment.bugsReportUrl)))) {
      this.spinner.hide();
      return throwError(() => new Error(this.langData.CO_LOI_XAY_RA));
    }

    try {
      this.notify(error, options.inline ?? false);
    } catch {
      this.alert.error(this.langData.CO_LOI_XAY_RA);
    }

    this.spinner.hide();
    return throwError(() => new Error(this.langData.CO_LOI_XAY_RA));
  }

  private notify(error: HttpErrorResponse, inline: boolean): void {
    const api = toApiError(error);
    const message = api?.message ?? this.langData.CO_LOI_XAY_RA;

    if (error.status === 0) { // Mất mạng hoặc hết thời gian: không đăng xuất người dùng vì một lần rớt mạng
      this.alert.error('Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.');
      return;
    }

    if (error.status === 403) { // Đã đăng nhập nhưng không đủ quyền: KHÔNG chuyển về đăng nhập
      this.alert.error('Bạn không có quyền truy cập chức năng này.');
      return;
    }

    if (error.status >= 500) {
      const correlationId = error.headers?.get('X-Correlation-Id');
      this.alert.error(
        correlationId ? `Mã truy vết: ${correlationId}` : '',
        'Đã xảy ra lỗi nội bộ hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
      );
      if (!isDevMode()) {
        this.submitBugsReport(`[${error.status}] ${correlationId ?? ''} ${api?.path ?? ''}`);
      }
      return;
    }

    if (inline) { // Màn hình sẽ tự hiển thị 400/401/404/409/422 ngay tại form
      return;
    }

    switch (error.status) {
      case 401:
        this.expireSession();
        break;
      case 404:
        this.alert.warning('Không tìm thấy dữ liệu yêu cầu.');
        break;
      case 422:
        this.alert.error(message);
        break;
      default: // 400, 409 và các 4xx khác
        this.alert.warning(message);
        break;
    }
  }

  private expireSession(): void {
    const returnUrl = this.router.url;
    this.authSvc.clearSession();
    this.alert.warning('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
    if (!returnUrl.startsWith(UrlConstant.ROUTE.AUTH.LOGIN)) {
      this.router.navigate([UrlConstant.ROUTE.AUTH.LOGIN], { queryParams: { returnUrl } });
    }
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
