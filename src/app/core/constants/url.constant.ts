/* eslint-disable @typescript-eslint/naming-convention */
import { environment } from '@env';

export const UrlConstant = {
  // 'method' string need uppercase for improving perfomance
  GOOGLE_URL: [{ regex: '.*googleapis.*', method: 'GET' }],
  PUBLIC_URL: [
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

      CATEGORIES: '/mng/categories',
      ACADEMIC_RANKS: '/mng/categories/academic-ranks',

      SETTINGS: '/mng/settings',
      COMMON_SETTINGS: '/mng/settings/common',
    },
  },
};
