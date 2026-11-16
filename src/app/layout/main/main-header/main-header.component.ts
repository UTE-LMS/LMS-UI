import { ApplicationRef, ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { AuthService } from '@services/auth/auth.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { concat, filter, first, takeWhile, timer } from 'rxjs';

export type PublicHeaderView = 'programs' | 'versions' | 'syllabi' | 'other';

@Component({
  selector: 'app-main-header',
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NzGridModule,
    NzDropdownModule,
    NzButtonModule,
  ],
})
export class MainHeaderComponent implements OnInit {
  private authSvc = inject(AuthService);
  private appRef = inject(ApplicationRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  urlConst = UrlConstant;

  isLogin = signal(false);
  isStudent = signal(false);
  isAdmin = signal(false);
  currentView = signal<PublicHeaderView>('programs');

  userName = signal('Menu');
  userAvatarLink = signal('');

  // Language ///////////////////
  langCode: 'en' | 'vi' = localStorage.getItem('language') as 'en' | 'vi' ?? 'vi';
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).LAYOUT.MAIN.HEADER;

  ngOnInit(): void {
    localStorage.setItem('language', this.langCode);
    this.checkLogin();
    this.syncActiveView();

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.checkLogin();
        this.syncActiveView();
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncActiveView();
      });

    concat(this.appRef.isStable.pipe(first(isStable => isStable)), timer(0, 1000))
      .pipe(
        takeWhile(() => !this.isLogin()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.checkLogin();
      });
  }

  private syncActiveView(): void {
    const urlPath = this.router.url.split('?')[0];
    if (urlPath !== '' && urlPath !== '/') {
      this.currentView.set('other');
      return;
    }
    const viewParam = this.route.snapshot.queryParamMap.get('view');
    if (viewParam === 'versions') {
      this.currentView.set('versions');
    } else if (viewParam === 'syllabi') {
      this.currentView.set('syllabi');
    } else {
      this.currentView.set('programs');
    }
  }

  checkLogin(): void {
    if (this.authSvc.getAuthData() && this.authSvc.getToken()) {
      this.isLogin.set(true);
      this.isStudent.set(false);
      this.isAdmin.set(Object.values(SystemConstant.MNG_ROLE).some(role => this.authSvc.checkRole(role)));
      this.userAvatarLink.set(this.authSvc.getAvatarOfLogin() ?? '');
      this.userName.set(this.authSvc.getNameOfLogin());
    } else {
      this.isLogin.set(false);
    }
  }

  onLogOut(): void {
    this.authSvc.doLogout(UrlConstant.ROUTE.MAIN.HOMEPAGE);
    this.isLogin.set(false);
  }

  switchLang(lang: string): void {
    localStorage.setItem('language', lang);
    window.location.reload();
  }
}
