import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

/** AuditLogController chỉ cho ADMIN. */
export const auditLogsMngMenu: ISiderMenu[] = [
  {
    roles: [SystemConstant.MNG_ROLE.ADMIN],
    icon: 'fa-solid fa-clock-rotate-left',
    title: 'Nhật ký thao tác',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.AUDIT_LOGS,
    listChild: [],
  },
];
