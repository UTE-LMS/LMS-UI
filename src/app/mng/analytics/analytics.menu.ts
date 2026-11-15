import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

/** Cùng tập vai trò với @PreAuthorize của AnalyticsController (ADMIN, QA, PROGRAM_MANAGER, LECTURER). */
export const analyticsMngMenu: ISiderMenu[] = [
  {
    roles: [
      SystemConstant.MNG_ROLE.ADMIN,
      SystemConstant.MNG_ROLE.PROGRAM_MANAGER,
      SystemConstant.MNG_ROLE.LECTURER,
      SystemConstant.MNG_ROLE.QA,
    ],
    icon: 'fa-solid fa-chart-column',
    title: 'Phân tích đa chiều',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.ANALYTICS,
    listChild: [],
  },
];
