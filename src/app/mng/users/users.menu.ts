import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

// Chỉ ADMIN thấy mục này; backend vẫn trả 403 nếu vai trò khác gọi API (API-CONTRACT.md §5.3).
export const usersMngMenu: ISiderMenu[] = [
  {
    roles: [SystemConstant.MNG_ROLE.ADMIN],
    icon: 'fa-solid fa-users',
    title: 'Người dùng',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.USERS,
    listChild: [],
  },
];
