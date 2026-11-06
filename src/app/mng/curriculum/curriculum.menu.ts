import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { ISiderMenu } from '@models/common/sider-menu.model';

export const curriculumMngMenu: ISiderMenu[] = [
  {
    roles: [
      SystemConstant.MNG_ROLE.PROGRAM_MANAGER,
      SystemConstant.MNG_ROLE.QA_OFFICER,
      SystemConstant.MNG_ROLE.DEPARTMENT_HEAD,
      SystemConstant.MNG_ROLE.LECTURER,
      SystemConstant.MNG_ROLE.VIEWER,
      SystemConstant.MNG_ROLE.ADMIN,
    ],
    icon: 'fa-solid fa-book-bookmark',
    title: 'Khung CTĐT & Chuẩn đầu ra',
    routerLink: UrlConstant.ROUTE.MANAGEMENT.CURRICULUM,
    listChild: [],
  },
];
