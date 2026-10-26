import { ChangeDetectionStrategy, Component, inject, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SystemConstant } from '@constants/system.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { IBugsReportDTO } from '@models/common/bugs-report.model';
import { BugsReportService } from '@services/common/bugs-report.service';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-main-footer',
  templateUrl: './main-footer.component.html',
  styleUrl: './main-footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NzGridModule,
    NzModalModule,
    NzInputModule,
  ],
})
export class MainFooterComponent {
  private bugsReportSvc = inject(BugsReportService);
  private nzModalSvc = inject(NzModalService);
  private alert = inject(ToastrService);
  private spinner = inject(NgxSpinnerService);

  nowYear = new Date().getFullYear();
  revison = SystemConstant.REVISON;
  bugReportData: IBugsReportDTO = {
    errorDomain: '',
    errorUrl: '',
    ua: '',
    errorInfo: '',
    otherInfo: '',
    email: '',
  };

  // Ngon ngu hien thi //////////
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).LAYOUT.MAIN.FOOTER;
  langDataSentry: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).SENTRY;
  ///////////////////////////////

  openBugReportTpl(template: TemplateRef<unknown>): void {
    this.nzModalSvc.create({
      nzTitle: this.langDataSentry.SENTRY_ERR_TITLE_MANUAL,
      nzContent: template,
      nzWidth: 600,
      nzOkText: this.langDataSentry.SENTRY_LABEL_SUBMIT,
      nzCancelText: this.langDataSentry.SENTRY_LABEL_CLOSE,
      nzOnOk: () => {
        if (!this.bugReportData.otherInfo) {
          return;
        }
        this.bugReportData.errorDomain = window.location.hostname;
        this.bugReportData.errorUrl = window.location.href;
        this.bugReportData.errorInfo = 'USER_SUBMIT';
        this.bugReportData.ua = window.navigator.userAgent;
        this.spinner.show();
        this.bugsReportSvc
          .submitBugsReport(this.bugReportData)
          .pipe(finalize(() => {
            this.spinner.hide();
          }))
          .subscribe({
            next: (res) => {
              if (res.status === 'success') {
                this.alert.success(this.langDataSentry.SENTRY_SUBMIT_OK);
                this.bugReportData.otherInfo = '';
              } else {
                this.alert.error(this.langDataSentry.SENTRY_SUBMIT_ERR);
              }
            },
            error: () => {
              this.alert.error(this.langDataSentry.SENTRY_SUBMIT_ERR);
            },
          });
      },
    });
  }
}
