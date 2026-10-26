import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { filter, take, timer } from 'rxjs';
import { MainFooterComponent } from '../main-footer/main-footer.component';
import { MainHeaderComponent } from '../main-header/main-header.component';
import { MainSidebarComponent } from '../main-sidebar/main-sidebar.component';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
  imports: [
    RouterOutlet,
    NzLayoutModule,
    NzDrawerModule,
    MainHeaderComponent,
    MainFooterComponent,
    MainSidebarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  sliderWidth = signal(270);
  isShowSider = signal(true);
  isShowDrawer = signal(false);
  isPubPage = signal(this.checkIsPublicPage(this.router.url));

  @HostListener('window:resize', [])
  onResize(): void {
    const scWidth = window.innerWidth;

    if (scWidth >= 992) {
      this.isShowSider.set(!this.isPubPage());
      this.isShowDrawer.set(false);
    } else {
      this.isShowSider.set(false);
    }

    if (scWidth >= 1500) {
      this.sliderWidth.set(285);
    } else if (scWidth >= 1300) {
      this.sliderWidth.set(280);
    } else if (scWidth >= 1200) {
      this.sliderWidth.set(275);
    } else {
      this.sliderWidth.set(270);
    }
  }

  ngOnInit(): void {
    this.updatePageState(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.updatePageState(event.urlAfterRedirects);
      });

    window.dispatchEvent(new Event('resize'));

    timer(0, 1000)
      .pipe(
        take(10),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => window.dispatchEvent(new Event('resize')));
  }

  private updatePageState(url: string): void {
    const isPublic = this.checkIsPublicPage(url);
    this.isPubPage.set(isPublic);
    this.isShowSider.set(!isPublic);
  }

  checkIsPublicPage(_url: string): boolean {
    // If not use sidebar, always return true
    return true;
    // Else need check: public page not show sidebar
    // return url.includes('/#/') ||
    //   url.includes(UrlConstant.ROUTE.AUTH.LOGIN)
    //   || url === UrlConstant.ROUTE.MAIN.HOMEPAGE
    //   || url === UrlConstant.ROUTE.MAIN.THONG_TIN_CA_NHAN;
  }
}
