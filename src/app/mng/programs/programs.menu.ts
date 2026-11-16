import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

export const programsMngMenu: ISiderMenu[] = [
  {
    roles: [
      SystemConstant.MNG_ROLE.ADMIN,
      SystemConstant.MNG_ROLE.PROGRAM_MANAGER,
    ],
    icon: 'fa-solid fa-graduation-cap',
    title: 'Danh mục CTĐT',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.PROGRAMS,
    listChild: [],
  },
];
