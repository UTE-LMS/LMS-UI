/* eslint-disable @typescript-eslint/naming-convention */
import { environment } from '@env';

export const UrlConstant = {
  // 'method' string need uppercase for improving perfomance
  GOOGLE_URL: [{ regex: '.*googleapis.*', method: 'GET' }],
  PUBLIC_URL: [
    // Đăng nhập là endpoint công khai: không gắn Bearer token cũ vào (API-CONTRACT.md §5.2.1)
    { regex: '.*/api/v1/auth/login$', method: 'POST' },
    { regex: 'https://api\\.hcmute\\.edu\\.vn:8443/.*', method: 'GET' },
    { regex: 'https://api\\.hcmute\\.edu\\.vn:8443/.*', method: 'POST' },
    { regex: 'https://api\\.hcmute\\.edu\\.vn:8443/.*', method: 'PUT' },
    { regex: 'https://api\\.hcmute\\.edu\\.vn:8443/.*', method: 'DELETE' },
  ],
  BYPASS_NGSW_URL: [{ regex: '.*SAMPLE_URL', method: 'DELETE' }],
  API: {
    // File
    FILE: environment.serverFileUrl + 'rest/file',
    GOOGLE_PEOPLE: 'https://people.googleapis.com/v1/people/me?personFields=names,photos,emailAddresses',

    // Main - NOTE: Remember to add ALL login api link to interceptor
    LOGIN_ADMIN: environment.serverUrl + 'rest/login',

    // F01 - Xác thực và người dùng (API-CONTRACT.md §5)
    AUTH_LOGIN: environment.serverUrl + 'api/v1/auth/login',
    AUTH_LOGOUT: environment.serverUrl + 'api/v1/auth/logout',
    AUTH_ME: environment.serverUrl + 'api/v1/auth/me',
    USERS: environment.serverUrl + 'api/v1/users',

    // F02 - Chương trình đào tạo và phiên bản (API-CONTRACT.md §6.1)
    PROGRAMS: environment.serverUrl + 'api/v1/programs',
    PROGRAM_VERSIONS: environment.serverUrl + 'api/v1/program-versions',
    PROGRAM_VERSION_DETAIL: (id: string) => `${environment.serverUrl}api/v1/program-versions/${id}`,
    PROGRAM_VERSION_STATUS: (id: string) => `${environment.serverUrl}api/v1/program-versions/${id}/status`,
    PROGRAM_VERSION_VERIFY: (id: string) => `${environment.serverUrl}api/v1/program-versions/${id}/verification`,
    PLOS: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/plos`,
    PLO_DETAIL: (pvId: string, id: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/plos/${id}`,
    PLO_VERIFY: (pvId: string, id: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/plos/${id}/verification`,
    PIS: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/pis`,
    PI_DETAIL: (pvId: string, id: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/pis/${id}`,
    PI_VERIFY: (pvId: string, id: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/pis/${id}/verification`,
    PI_CONTRIBUTIONS: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/pi-contributions`,
    PI_CONTRIBUTION_DETAIL: (pvId: string, id: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/pi-contributions/${id}`,
    PROGRAM_COURSES: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/courses`,

    // Categories
    DEMO_API: environment.serverUrl + 'rest/demo',
  },

  ROUTE: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
    },
    MAIN: {
      HOMEPAGE: '/',
      WORKSPACE: '/work',
      MY_ACCOUNT: '/me',
    },
    MANAGEMENT: {
      ADMIN_PROFILE: '/mng/profile',
      DASHBOARD: '/mng/dashboard',
      FORBIDDEN: '/mng/forbidden',

      USERS: '/mng/users',
      USERS_NEW: '/mng/users/new',

      PROGRAMS: '/mng/programs',
      CURRICULUM: '/mng/curriculum',
      CURRICULUM_DETAIL: (versionId: string) => `/mng/curriculum/versions/${versionId}`,
      CURRICULUM_EDIT: (versionId: string) => `/mng/curriculum/versions/${versionId}/edit`,

      CATEGORIES: '/mng/categories',
      ACADEMIC_RANKS: '/mng/categories/academic-ranks',

      SETTINGS: '/mng/settings',
      COMMON_SETTINGS: '/mng/settings/common',
    },
  },
};
