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

  // 4 vai trò cốt lõi của backend (OBE v0.7 / ADR 0014). Không thêm tiền tố ROLE_.
  public static ROLE = {
    ADMIN: 'ADMIN',
    PROGRAM_MANAGER: 'PROGRAM_MANAGER',
    LECTURER: 'LECTURER',
    QA: 'QA',
  } as const;

  // Vai trò được vào khu quản lý (/mng).
  public static MNG_ROLE = {
    ADMIN: SystemConstant.ROLE.ADMIN,
    PROGRAM_MANAGER: SystemConstant.ROLE.PROGRAM_MANAGER,
    LECTURER: SystemConstant.ROLE.LECTURER,
    QA: SystemConstant.ROLE.QA,
  } as const;

  public static ROLE_TITLE = [
    { id: SystemConstant.ROLE.ADMIN, title: { vi: 'Quản trị viên', en: 'Administrator' } },
    { id: SystemConstant.ROLE.PROGRAM_MANAGER, title: { vi: 'Quản lý CTĐT', en: 'Program manager' } },
    { id: SystemConstant.ROLE.LECTURER, title: { vi: 'Giảng viên', en: 'Lecturer' } },
    { id: SystemConstant.ROLE.QA, title: { vi: 'Cán bộ ĐBCL & Khảo thí', en: 'QA officer' } },
  ];

  // Khớp rule 03 của backend: ObjectId là chuỗi 24 ký tự hex (API-CONTRACT.md §1.3).
  public static OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
}
