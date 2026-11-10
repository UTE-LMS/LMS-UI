import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

export const sectionsMngMenu: ISiderMenu[] = [
  {
    // Chỉ để ẩn/hiện menu; backend lọc lớp theo quyền của người gọi
    roles: Object.values(SystemConstant.MNG_ROLE),
    icon: 'fa-solid fa-users-rectangle',
    title: 'Lớp học phần',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.SECTIONS,
    listChild: [],
  },
];
