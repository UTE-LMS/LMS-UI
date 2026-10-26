import { ApplicationRef, ChangeDetectionStrategy, Component, inject, OnInit, signal, viewChildren } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { ISiderMenu } from '@models/common/sider-menu.model';
import { AuthService } from '@services/auth/auth.service';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSubMenuComponent } from 'ng-zorro-antd/menu';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { concat, first, takeWhile, timer } from 'rxjs';

@Component({
  selector: 'app-management-sidebar',
  templateUrl: './management-sidebar.component.html',
  styleUrl: './management-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    NzDropdownModule,
    NzTooltipModule,
    NzGridModule,
  ],
})
export class ManagementSidebarComponent implements OnInit {
  private authSvc = inject(AuthService);
  private appRef = inject(ApplicationRef);

  readonly subMenuItem = viewChildren<NzSubMenuComponent>('subMenuItem');

  // Ngon ngu hien thi //////////
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).LAYOUT.MNG.SIDEBAR;
  //////////////////////////////

  nameOfUser = signal('');
  avatarOfUser = signal('');

  readonly listMenu: ISiderMenu[] = [
    {
      roles: [SystemConstant.MNG_ROLE.ADMIN],
      icon: 'fa-solid fa-solar-panel', // If have child, this icon must using from zorro
      title: this.langData.TONG_QUAN,
      routerLink: UrlConstant.ROUTE.MANAGEMENT.DASHBOARD,
      listChild: [],
    },
  ];

  readonly listRoleUser: string[] = []; // = this.authSvc.getRoles();

  ngOnInit(): void {
    // this.nhanVienSvc.getCurrentLogin()
    //   .subscribe(res => {
    //     // If use this, convert this.listRoleUser to signal before
    //     this.listRoleUser = res.roles;
    //   });
    concat(this.appRef.isStable.pipe(first(isStable => isStable)), timer(0, 500))
      .pipe(takeWhile(() => !this.nameOfUser()))
      .subscribe(() => {
        this.checkLogin();
      });
  }

  checkLogin(): void {
    this.nameOfUser.set(this.authSvc.getNameOfLogin());
    this.avatarOfUser.set(this.authSvc.getAvatarOfLogin());
  }

  checkRole(listRoleCheck: string[]) {
    if (!listRoleCheck.length) {
      return true;
    }
    return !!this.listRoleUser.filter(value => listRoleCheck.includes(value)).length;
  }

  autoHideMenu() {
    this.subMenuItem().forEach(e => {
      if (!e.isSelected && !e.isActive && e.nzOpen) {
        e.toggleSubMenu();
      }
    });
  }
}
