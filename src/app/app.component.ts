import { ViewportScroller } from '@angular/common';
import { AfterViewInit, ApplicationRef, ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { SystemConstant } from '@constants/system.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { OnlineStatusModule, OnlineStatusService, OnlineStatusType } from 'ngx-online-status';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { concat, first, interval, take, timer } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    OnlineStatusModule,
    NzIconModule,
    NzAlertModule,
    NzModalModule,
    NgxSpinnerModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, AfterViewInit {
  private readonly onlineSttSvc = inject(OnlineStatusService);
  private readonly appRef = inject(ApplicationRef);
  private readonly updates = inject(SwUpdate);
  private readonly alert = inject(ToastrService);
  private readonly modalSvc = inject(NzModalService);
  private readonly scroller = inject(ViewportScroller);
  private readonly cdr = inject(ChangeDetectorRef);

  // Ngon ngu hien thi //////////
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).APP;
  //////////////////////////////

  onlineStt: OnlineStatusType = this.onlineSttSvc.getStatus();

  ngOnInit() {
    // Setting language
    if (localStorage.getItem('language') === 'null') {
      localStorage.setItem('language', 'vi');
      this.langData = langDataVi.APP;
    }
    // Checking connection status
    this.onlineSttSvc.status.subscribe((status: OnlineStatusType) => {
      this.onlineStt = status;
      this.cdr.detectChanges();
    });

    // Checking web updates
    this.updates.versionUpdates.subscribe(evt => {
      switch (evt.type) {
        case 'VERSION_DETECTED':
          console.log(
            `%c${this.langData['DANG_TAI_PHIEN_BAN_MOI']}: ${evt.version.hash}`,
            'background: #007bff; color: #fff; padding: 5px 10px;',
          );
          this.alert.warning(this.langData['TAI_PHIEN_BAN_MOI']);
          break;
        case 'VERSION_READY':
          console.log(
            `%c${this.langData['PHIEN_BAN_HIEN_TAI']}: ${evt.currentVersion.hash}`,
            'background: #2e3192; color: #fff; padding: 5px 10px;',
          );
          console.log(
            `%c${this.langData['PHIEN_BAN_MOI_SAN_SANG']}: ${evt.latestVersion.hash}`,
            'background: #28a745; color: #fff; padding: 5px 10px;',
          );
          // Force reload if critical update
          if (
            (evt.latestVersion.appData as { forceUpdate: boolean; } | undefined)?.forceUpdate
          ) {
            window.location.reload();
          } else {
            this.alert.info(this.langData['CO_PHIEN_BAN_MOI']);
          }
          break;
        case 'VERSION_INSTALLATION_FAILED':
          console.error(`${this.langData['PHIEN_BAN_CAP_NHAT_LOI']} ${evt.version.hash}: ${evt.error}`);
          this.alert.warning(this.langData['KHONG_THE_CAP_NHAT_PHIEN_BAN_MOI']);
          break;
        case 'NO_NEW_VERSION_DETECTED':
          console.log(this.langData['CHUA_CO_CAP_NHAT']);
          break;
      }
    });

    // Any Rxjs Timer inf-loop before app is stable will make the app unstable
    // So we need to wait for the app to be stable before starting the timer
    const isAppStableObs = this.appRef.isStable.pipe(first(isStable => isStable));
    const checkTimeObs = interval(3600000); // 1h = 3600000 ms
    const trackingObs = concat(isAppStableObs, checkTimeObs);

    trackingObs.subscribe(() => {
      console.log(
        `%c${this.langData['DANG_KIEM_TRA_CAP_NHAT']}`,
        'color: #007bff',
      );
      this.updates.checkForUpdate();
    });
  }

  ngAfterViewInit(): void {
    if (SystemConstant.WEBVIEW_UA.some(x => window.navigator.userAgent.includes(x))
      && window.location.pathname === '/') {
      this.modalSvc.create({
        nzStyle: { maxWidth: '500px' },
        nzWidth: '90%',
        nzTitle: '&nbsp;',
        nzContent: this.langData['CANH_BAO_WEBVIEW'],
        nzOkText: this.langData['DA_HIEU'],
        nzCancelText: null,
      });
    }

    timer(0, 500)
      .pipe(take(5)).subscribe(() => {
        this.goLeft();
      });
  }

  goTop() {
    this.scroller.scrollToPosition([0, 0], { behavior: 'smooth' });
  }

  goLeft() {
    window.scrollTo({ left: 0, behavior: 'instant' });
  }
}
