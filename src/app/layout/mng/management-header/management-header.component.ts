import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';
import { ISiderMenu } from '@models/common/sider-menu.model';
import { coursesMngMenu } from '@mng/courses/courses.menu';
import { curriculumMngMenu } from '@mng/curriculum/curriculum.menu';
import { programsMngMenu } from '@mng/programs/programs.menu';
import { syllabiMngMenu } from '@mng/syllabi/syllabi.menu';
import { usersMngMenu } from '@mng/users/users.menu';
import { AuthService } from '@services/auth/auth.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzMenuModule } from 'ng-zorro-antd/menu';

const dashboardMenu: ISiderMenu[] = [
  {
    roles: Object.values(SystemConstant.MNG_ROLE),
    icon: 'fa-solid fa-solar-panel',
    title: 'Tổng quan',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.DASHBOARD,
    listChild: [],
  },
];

@Component({
  selector: 'app-management-header',
  templateUrl: './management-header.component.html',
  styleUrl: './management-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    NzGridModule,
    NzDropdownModule,
    NzMenuModule,
    NzButtonModule,
  ],
})
export class ManagementHeaderComponent implements OnInit {
  private authSvc = inject(AuthService);
  private router = inject(Router);

  readonly urlConst = UrlConstant;

  username = signal('');
  fullName = signal('');
  roles = signal<string[]>([]);
  avatarOfUser = signal('');

  // Ngôn ngữ hiển thị
  langCode: 'en' | 'vi' = (localStorage.getItem('language') as 'en' | 'vi') ?? 'vi';
  langData: Record<string, string> = (localStorage.getItem('language') === 'en' ? langDataEn : langDataVi).LAYOUT.MNG.HEADER;

  /**
   * Danh sách mục điều hướng trên thanh header được tổng hợp từ menu của từng chức năng.
   */
  readonly allNavItems: ISiderMenu[] = [
    ...dashboardMenu,
    ...usersMngMenu,
    ...programsMngMenu,
    ...curriculumMngMenu,
    ...coursesMngMenu,
    ...syllabiMngMenu,
  ];

  /** Lọc các mục menu phù hợp với vai trò của người dùng hiện tại */
  readonly visibleNavItems = computed(() => {
    const userRoles = this.roles();
    return this.allNavItems.filter(item => {
      if (!item.roles || item.roles.length === 0) {
        return true;
      }
      return item.roles.some(r => userRoles.includes(r));
    });
  });

  /** Viết tắt 2 chữ cái đại diện vai trò chính để hiển thị huy hiệu avatar như trong UI.pdf */
  readonly roleBadgeText = computed(() => {
    const userRoles = this.roles();
    if (userRoles.includes(SystemConstant.ROLE.ADMIN)) return 'QT';
    if (userRoles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)) return 'QL';
    if (userRoles.includes(SystemConstant.ROLE.DEPARTMENT_HEAD)) return 'TK';
    if (userRoles.includes(SystemConstant.ROLE.QA_OFFICER)) return 'QA';
    if (userRoles.includes(SystemConstant.ROLE.LECTURER)) return 'GV';
    if (userRoles.includes(SystemConstant.ROLE.STUDENT)) return 'SV';
    if (userRoles.includes(SystemConstant.ROLE.VIEWER)) return 'NX';
    return 'ND';
  });

  /** Tên hiển thị của vai trò chính */
  readonly roleTitle = computed(() => {
    const userRoles = this.roles();
    const primaryRole = userRoles[0];
    const match = SystemConstant.ROLE_TITLE.find(r => r.id === primaryRole);
    return match ? match.title.vi : primaryRole || 'Người dùng';
  });

  ngOnInit(): void {
    this.refreshUserInfo();
  }

  refreshUserInfo(): void {
    this.username.set(this.authSvc.getUsername());
    this.fullName.set(this.authSvc.getNameOfLogin());
    this.roles.set(this.authSvc.getRoles());
    this.avatarOfUser.set(this.authSvc.getAvatarOfLogin());
  }

  /**
   * Đăng xuất: Báo backend vô hiệu hóa token và điều hướng về trang đăng nhập
   */
  doLogout(): void {
    this.authSvc.logout().subscribe(() => {
      void this.router.navigateByUrl(UrlConstant.ROUTE.AUTH.LOGIN);
    });
  }

  switchLang(lang: 'en' | 'vi'): void {
    localStorage.setItem('language', lang);
    this.langCode = lang;
    window.location.reload();
  }
}
