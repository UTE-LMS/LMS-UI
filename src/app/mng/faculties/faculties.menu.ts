import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

export const facultiesMngMenu: ISiderMenu[] = [
  {
    roles: [SystemConstant.MNG_ROLE.ADMIN],
    icon: 'fa-solid fa-building-columns',
    title: 'Khoa',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.FACULTIES,
    listChild: [],
  },
];
