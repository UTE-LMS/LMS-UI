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

    // F03 & F05a (Terms, Courses, Syllabi, CLOs, CLO-PI Links)
    TERMS: environment.serverUrl + 'api/v1/terms',
    TERM_DETAIL: (id: string) => `${environment.serverUrl}api/v1/terms/${id}`,
    TERM_STATUS: (id: string) => `${environment.serverUrl}api/v1/terms/${id}/status`,

    COURSES: environment.serverUrl + 'api/v1/courses',
    COURSE_IMPORT: environment.serverUrl + 'api/v1/courses/import',
    COURSE_DETAIL: (id: string) => `${environment.serverUrl}api/v1/courses/${id}`,
    PROGRAM_COURSE_DETAIL: (pvId: string, courseId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/courses/${courseId}`,

    DEPARTMENT_LECTURERS: environment.serverUrl + 'api/v1/departments/lecturers',
    DEPARTMENT_ASSIGN_COURSE: environment.serverUrl + 'api/v1/departments/assign-course',
    DEPARTMENT_UNASSIGN_COURSE: environment.serverUrl + 'api/v1/departments/unassign-course',

    COURSE_SYLLABI: (courseId: string) => `${environment.serverUrl}api/v1/courses/${courseId}/syllabi`,
    SYLLABUS_DETAIL: (id: string) => `${environment.serverUrl}api/v1/syllabi/${id}`,
    SYLLABUS_STATUS: (id: string) => `${environment.serverUrl}api/v1/syllabi/${id}/status`,

    SYLLABUS_CLOS: (syllabusId: string) => `${environment.serverUrl}api/v1/syllabi/${syllabusId}/clos`,
    CLO_DETAIL: (id: string) => `${environment.serverUrl}api/v1/clos/${id}`,

    SYLLABUS_CLO_PI_LINKS: (syllabusId: string) => `${environment.serverUrl}api/v1/syllabi/${syllabusId}/clo-pi-links`,
    SYLLABUS_CLO_PI_MATRIX: (syllabusId: string) => `${environment.serverUrl}api/v1/syllabi/${syllabusId}/clo-pi-matrix`,
    CLO_PI_LINK_DETAIL: (id: string) => `${environment.serverUrl}api/v1/clo-pi-links/${id}`,
    CLO_PI_LINK_VERIFY: (id: string) => `${environment.serverUrl}api/v1/clo-pi-links/${id}/verification`,

    // F05a - Lớp học phần, ghi danh, nhập danh sách lớp (API-CONTRACT.md §6.4)
    SECTIONS: environment.serverUrl + 'api/v1/sections',
    SECTION_DETAIL: (id: string) => `${environment.serverUrl}api/v1/sections/${id}`,
    SECTION_STATUS: (id: string) => `${environment.serverUrl}api/v1/sections/${id}/status`,
    SECTION_ENROLLMENTS: (sectionId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/enrollments`,
    SECTION_ENROLLMENT_IMPORT: (sectionId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/enrollments/import`,
    ENROLLMENT_STATUS: (id: string) => `${environment.serverUrl}api/v1/enrollments/${id}/status`,

    // F04 - Bài đánh giá & khóa ma trận (API-CONTRACT.md §6.3, OBE v0.7)
    SYLLABUS_ASSESSMENT_TEMPLATES: (syllabusId: string) => `${environment.serverUrl}api/v1/syllabi/${syllabusId}/assessment-templates`,
    SECTION_ASSESSMENTS: (sectionId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/assessments`,
    ASSESSMENT_DETAIL: (id: string) => `${environment.serverUrl}api/v1/assessments/${id}`,
    ASSESSMENT_ITEMS: (id: string) => `${environment.serverUrl}api/v1/assessments/${id}/items`,
    ASSESSMENT_COVERAGE: (id: string) => `${environment.serverUrl}api/v1/assessments/${id}/coverage`,
    ASSESSMENT_LOCK: (id: string) => `${environment.serverUrl}api/v1/assessments/${id}/lock`,
    ASSESSMENT_UNLOCK: (id: string) => `${environment.serverUrl}api/v1/assessments/${id}/unlock`,
    ASSESSMENT_SCORE_TEMPLATE_CSV: (id: string) => `${environment.serverUrl}api/v1/assessments/${id}/scores/template-csv`,

    // F05b - Lô nhập điểm thi 3-bước (ADR 0014, Schema v0.7)
    IMPORT_BATCH_CREATE: (sectionId: string, assessmentId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/assessments/${assessmentId}/import-batches`,
    IMPORT_BATCH_LIST: (sectionId: string, assessmentId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/assessments/${assessmentId}/import-batches`,
    IMPORT_BATCH_DETAIL: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}`,
    IMPORT_BATCH_ERRORS: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}/errors`,
    IMPORT_BATCH_VALIDATE: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}/validate`,
    IMPORT_BATCH_CONFIRM: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}/confirm`,
    IMPORT_BATCH_ROLLBACK: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}/rollback`,

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

      COURSES: '/mng/courses',
      SYLLABI: '/mng/syllabi',
      SYLLABUS_DETAIL: (syllabusId: string) => `/mng/syllabi/${syllabusId}`,

      SECTIONS: '/mng/sections',
      SECTION_DETAIL: (sectionId: string) => `/mng/sections/${sectionId}`,
      SECTION_ROSTER_IMPORT: (sectionId: string) => `/mng/sections/${sectionId}/roster-import`,

      ASSESSMENTS_OF_SECTION: (sectionId: string) => `/mng/assessments/sections/${sectionId}`,
      ASSESSMENT_TEMPLATES: (syllabusId: string) => `/mng/assessments/syllabi/${syllabusId}`,
      ASSESSMENT_DETAIL: (assessmentId: string) => `/mng/assessments/${assessmentId}`,
      ASSESSMENT_REVIEW: (assessmentId: string) => `/mng/assessments/${assessmentId}/review`,
      ASSESSMENT_SCORE_IMPORT: (assessmentId: string) => `/mng/assessments/${assessmentId}/score-import`,

      CATEGORIES: '/mng/categories',
      ACADEMIC_RANKS: '/mng/categories/academic-ranks',

      SETTINGS: '/mng/settings',
      COMMON_SETTINGS: '/mng/settings/common',
    },
  },
};
