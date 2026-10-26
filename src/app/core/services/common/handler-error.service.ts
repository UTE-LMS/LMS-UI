/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, isDevMode } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { environment } from '@env';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { IBugsReportDTO } from '@models/common/bugs-report.model';
import { AuthService } from '@services/auth/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, throwError } from 'rxjs';
import { BugsReportService } from './bugs-report.service';

@Injectable({
  providedIn: 'root',
})
export class HandlerErrorService {
  private authSvc = inject(AuthService);
  private alert = inject(ToastrService);
  private spinner = inject(NgxSpinnerService);
  private bugsReportSvc = inject(BugsReportService);

  // Ngon ngu hien thi //////////
  // private langCode: 'en' | 'vi' = localStorage.getItem('language') as 'en' | 'vi' ?? 'vi';
  private langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).CORE.HANDLE_ERROR;
  //////////////////////////////

  private routerNext = '';

  handleError(error: HttpErrorResponse): Observable<never> {
    // Tránh vòng lặp vô tận nếu chính API report bị lỗi
    if (error.url && (error.url.includes('script.google.com') || (environment.bugsReportUrl && error.url.includes(environment.bugsReportUrl)))) {
      this.spinner.hide();
      return throwError(() => new Error(error.error ?? this.langData.CO_LOI_XAY_RA));
    }

    if (this.authSvc.getAuthData() && this.authSvc.getToken()) {
      this.routerNext = UrlConstant.ROUTE.AUTH.LOGIN;
    } else {
      this.routerNext = UrlConstant.ROUTE.MAIN.HOMEPAGE;
    }

    try {
      if (error.status) {
        switch (error.status) {
          case 401:
            this.alert.error(this.langData.TAI_KHOAN_KHONG_CO_QUYEN);
            if (!isDevMode()) {
              this.authSvc.doLogout(UrlConstant.ROUTE.AUTH.LOGIN);
            }
            break;
          case 403:
            this.alert.error(this.langData.TAI_KHOAN_KHONG_CO_QUYEN);
            if (!isDevMode()) {
              this.authSvc.doLogout(UrlConstant.ROUTE.AUTH.LOGIN);
            }
            break;
          default:
            if (!isDevMode()) {
              this.submitBugsReport(`[${error.status}] ${JSON.stringify(error)}`);
            }
            if (error.error instanceof Blob) {
              error.error.text().then(errText => {
                const blobJson = JSON.parse(errText) as HttpErrorResponse;
                this.alert.error(blobJson.message ?? this.langData.CO_LOI_XAY_RA);
              });
            } else if (error.error?.error?.message) { // Error message of file svc
              this.alert.error(error.error?.error?.message ?? this.langData.CO_LOI_XAY_RA);
            } else {
              this.alert.error(error.error.message ?? this.langData.CO_LOI_XAY_RA);
            }
            break;
        }
      } else {
        this.alert.error(this.langData.CO_LOI_XAY_RA);
        if (!isDevMode()) {
          this.submitBugsReport(`[${error.status}] ${JSON.stringify(error)}`);
          this.authSvc.doLogout(this.routerNext);
        } else {
          console.log('routerNext: ', this.routerNext);
        }
      }
    } catch {
      this.alert.error(this.langData.CO_LOI_XAY_RA);
    }

    this.spinner.hide();
    return throwError(() => new Error(error.error ?? this.langData.CO_LOI_XAY_RA));
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
