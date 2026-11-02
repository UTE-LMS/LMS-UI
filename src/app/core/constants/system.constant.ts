export class SystemConstant {
  public static REVISON = '260703.1';
  public static WEB_NAME = 'LMS-UI';

  public static CURRENT_INFO = 'CURRENT_INFO';
  public static CURRENT_INFO_DATA = 'CURRENT_INFO_DATA';
  public static CURRENT_INFO_SKEY = 'CURRENT_INFO_SKEY';

  public static WEBVIEW_UA = ['Instagram', 'FBAV', 'FBAN', 'Zalo'];

  public static ACTION = {
    ADD: 'ADD',
    EDIT: 'EDIT',
    DELETE: 'DELETE',
    VIEW: 'VIEW',
  };

  // 7 giá trị enum vai trò của backend (API-CONTRACT.md §5.3.2). Không thêm tiền tố ROLE_.
  public static ROLE = {
    ADMIN: 'ADMIN',
    PROGRAM_MANAGER: 'PROGRAM_MANAGER',
    DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
    QA_OFFICER: 'QA_OFFICER',
    LECTURER: 'LECTURER',
    STUDENT: 'STUDENT',
    VIEWER: 'VIEWER',
  } as const;

  // Vai trò được vào khu quản lý (/mng). STUDENT chờ NEW-03 nên chưa có.
  public static MNG_ROLE = {
    ADMIN: SystemConstant.ROLE.ADMIN,
    PROGRAM_MANAGER: SystemConstant.ROLE.PROGRAM_MANAGER,
    DEPARTMENT_HEAD: SystemConstant.ROLE.DEPARTMENT_HEAD,
    QA_OFFICER: SystemConstant.ROLE.QA_OFFICER,
    LECTURER: SystemConstant.ROLE.LECTURER,
    VIEWER: SystemConstant.ROLE.VIEWER,
  } as const;

  public static ROLE_TITLE = [
    { id: SystemConstant.ROLE.ADMIN, title: { vi: 'Quản trị viên', en: 'Administrator' } },
    { id: SystemConstant.ROLE.PROGRAM_MANAGER, title: { vi: 'Quản lý CTĐT', en: 'Program manager' } },
    { id: SystemConstant.ROLE.DEPARTMENT_HEAD, title: { vi: 'Trưởng khoa / bộ môn', en: 'Department head' } },
    { id: SystemConstant.ROLE.QA_OFFICER, title: { vi: 'Cán bộ đảm bảo chất lượng', en: 'QA officer' } },
    { id: SystemConstant.ROLE.LECTURER, title: { vi: 'Giảng viên', en: 'Lecturer' } },
    { id: SystemConstant.ROLE.STUDENT, title: { vi: 'Sinh viên', en: 'Student' } },
    { id: SystemConstant.ROLE.VIEWER, title: { vi: 'Người xem', en: 'Viewer' } },
  ];

  // Khớp rule 03 của backend: ObjectId là chuỗi 24 ký tự hex (API-CONTRACT.md §1.3).
  public static OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
}
