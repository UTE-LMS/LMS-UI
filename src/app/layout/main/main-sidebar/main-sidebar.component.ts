import { ChangeDetectionStrategy, Component, inject, OnInit, signal, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ISiderMenu } from '@models/common/sider-menu.model';
import { AuthService } from '@services/auth/auth.service';
import { NzMenuModule, NzSubMenuComponent } from 'ng-zorro-antd/menu';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-main-sidebar',
  imports: [
    RouterLink,
    NzMenuModule,
    NzTooltipModule,
  ],
  templateUrl: './main-sidebar.component.html',
  styleUrl: './main-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainSidebarComponent implements OnInit {
  private authSvc = inject(AuthService);

  readonly subMenuItem = viewChildren<NzSubMenuComponent>('subMenuItem');

  // Language ///////////////////
  // langCode: 'en' | 'vi' = localStorage.getItem('language') as 'en' | 'vi' ?? 'vi';
  // langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).LAYOUT.MAIN.SIDEBAR;
  ///////////////////////////////

  nameOfUser = signal('');
  avatarOfUser = signal('');

  readonly listMenu: ISiderMenu[] = [
    // ...featuresUserMenu,
  ];

  listRoleUser: string[] = []; // ... = this.authSvc.getRoles();

  ngOnInit(): void {
    this.nameOfUser.set(this.authSvc.getNameOfLogin());
    this.avatarOfUser.set(this.authSvc.getAvatarOfLogin());
  }

  checkRole(roles: string[]): boolean {
    return !!roles.length; // return this.authSvc.checkListRole(roles);
  }

  // autoHideMenu() {
  //   this.subMenuItem().forEach(e => {
  //     if (!e.isSelected && !e.isActive && e.nzOpen) {
  //       e.toggleSubMenu();
  //     }
  //   });
  // }
}
