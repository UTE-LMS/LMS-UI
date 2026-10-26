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

  public static ROLE = {
    STUDENT: 'ROLE_STUDENT',
  };
  public static MNG_ROLE = {
    ADMIN: 'ROLE_ADMIN',
  };

  public static ROLE_TITLE = [
    { id: SystemConstant.MNG_ROLE.ADMIN, title: { vi: 'Quản trị viên', en: 'Administrator' } },
    { id: SystemConstant.ROLE.STUDENT, title: { vi: 'Sinh viên', en: 'Student' } },
  ];
}
