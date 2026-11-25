import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

// Chỉ ADMIN thấy mục này; backend vẫn trả 403 nếu vai trò khác gọi API.
export const studentsMngMenu: ISiderMenu[] = [
  {
    roles: [SystemConstant.MNG_ROLE.ADMIN],
    icon: 'fa-solid fa-user-graduate',
    title: 'Sinh viên',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.STUDENTS,
    listChild: [],
  },
];
