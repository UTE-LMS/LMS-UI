import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

export const reportsMngMenu: ISiderMenu[] = [
  {
    roles: [
      SystemConstant.MNG_ROLE.ADMIN,
      SystemConstant.MNG_ROLE.PROGRAM_MANAGER,
      SystemConstant.MNG_ROLE.LECTURER,
      SystemConstant.MNG_ROLE.QA,
    ],
    icon: 'fa-solid fa-chart-pie',
    title: 'Báo cáo QA & Truy vết',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.REPORTS,
    listChild: [],
  },
];
