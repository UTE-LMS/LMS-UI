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
    AUTH_CHANGE_PASSWORD: environment.serverUrl + 'api/v1/auth/change-password',
    USERS: environment.serverUrl + 'api/v1/users',
    USER_IMPORT_TEMPLATE: environment.serverUrl + 'api/v1/users/import-template',
    USER_IMPORT: environment.serverUrl + 'api/v1/users/import',

    // F02a - Khoa & Điều phối viên (ADR / R2)
    FACULTIES: environment.serverUrl + 'api/v1/faculties',
    FACULTY_IMPORT_TEMPLATE: environment.serverUrl + 'api/v1/faculties/import-template',
    FACULTY_IMPORT: environment.serverUrl + 'api/v1/faculties/import',
    FACULTY_DETAIL: (id: string) => `${environment.serverUrl}api/v1/faculties/${id}`,
    FACULTY_STATUS: (id: string) => `${environment.serverUrl}api/v1/faculties/${id}/status`,
    FACULTY_PROGRAM_MANAGERS: (id: string) => `${environment.serverUrl}api/v1/faculties/${id}/program-managers`,
    FACULTY_PMS: (id: string) => `${environment.serverUrl}api/v1/faculties/${id}/program-managers`,
    FACULTY_PROGRAM_MANAGER_DELETE: (facultyId: string, userId: string) => `${environment.serverUrl}api/v1/faculties/${facultyId}/program-managers/${userId}`,
    FACULTY_PM_DETAIL: (facultyId: string, userId: string) => `${environment.serverUrl}api/v1/faculties/${facultyId}/program-managers/${userId}`,
    FACULTY_TRANSFER_PM: environment.serverUrl + 'api/v1/faculties/transfer-program-manager',
    FACULTY_TRANSFER_PROGRAM_MANAGER: environment.serverUrl + 'api/v1/faculties/transfer-program-manager',

    // F02 - Chương trình đào tạo và phiên bản (API-CONTRACT.md §6.1)
    PROGRAMS: environment.serverUrl + 'api/v1/programs',
    PROGRAM_VERSIONS: environment.serverUrl + 'api/v1/program-versions',
    PROGRAM_VERSION_IMPORT_TEMPLATE: environment.serverUrl + 'api/v1/program-versions/import-template',
    PROGRAM_VERSION_IMPORT: environment.serverUrl + 'api/v1/program-versions/import',
    PROGRAM_VERSION_IMPORT_PREVIEW: environment.serverUrl + 'api/v1/program-versions/import/preview',
    PROGRAM_VERSION_CONFIRM_IMPORT: (id: string) => `${environment.serverUrl}api/v1/program-versions/${id}/confirm-import`,
    PROGRAM_VERSION_LOCK: (id: string) => `${environment.serverUrl}api/v1/program-versions/${id}/lock`,
    PROGRAM_VERSION_DETAIL: (id: string) => `${environment.serverUrl}api/v1/program-versions/${id}`,
    PROGRAM_VERSION_STATUS: (id: string) => `${environment.serverUrl}api/v1/program-versions/${id}/status`,
    PROGRAM_VERSION_SYLLABI: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/syllabi`,
    PLOS: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/plos`,
    PLO_DETAIL: (pvId: string, id: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/plos/${id}`,
    PIS: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/pis`,
    PI_DETAIL: (pvId: string, id: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/pis/${id}`,
    PROGRAM_COURSES: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/courses`,
    PROGRAM_COURSE_IMPORT_TEMPLATE: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/courses/import-template`,
    PROGRAM_COURSE_IMPORT: (pvId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/courses/import`,

    // F03 & F05a (Terms, Courses, Syllabi, CLOs, CLO-PI Links)
    TERMS: environment.serverUrl + 'api/v1/terms',
    TERM_DETAIL: (id: string) => `${environment.serverUrl}api/v1/terms/${id}`,
    TERM_STATUS: (id: string) => `${environment.serverUrl}api/v1/terms/${id}/status`,

    COURSES: environment.serverUrl + 'api/v1/courses',
    COURSE_IMPORT_TEMPLATE: environment.serverUrl + 'api/v1/courses/import-template',
    COURSE_IMPORT: environment.serverUrl + 'api/v1/courses/import',
    COURSE_DETAIL: (id: string) => `${environment.serverUrl}api/v1/courses/${id}`,
    PROGRAM_COURSE_DETAIL: (pvId: string, courseId: string) => `${environment.serverUrl}api/v1/program-versions/${pvId}/courses/${courseId}`,

    COURSE_SYLLABI: (courseId: string) => `${environment.serverUrl}api/v1/courses/${courseId}/syllabi`,
    COURSE_SYLLABI_IMPORT_TEMPLATE: (courseId: string) => `${environment.serverUrl}api/v1/courses/${courseId}/syllabi/import-template`,
    COURSE_SYLLABI_IMPORT: (courseId: string) => `${environment.serverUrl}api/v1/courses/${courseId}/syllabi/import`,
    COURSE_SYLLABI_IMPORT_PREVIEW: (courseId: string) => `${environment.serverUrl}api/v1/courses/${courseId}/syllabi/import/preview`,
    SYLLABUS_IMPORT_PREVIEW: (courseId: string) => `${environment.serverUrl}api/v1/courses/${courseId}/syllabi/import/preview`,
    SYLLABUS_CONFIRM_IMPORT: (id: string) => `${environment.serverUrl}api/v1/syllabi/${id}/confirm-import`,
    SYLLABUS_LOCK: (id: string) => `${environment.serverUrl}api/v1/syllabi/${id}/lock`,
    SYLLABUS_DETAIL: (id: string) => `${environment.serverUrl}api/v1/syllabi/${id}`,
    SYLLABUS_STATUS: (id: string) => `${environment.serverUrl}api/v1/syllabi/${id}/status`,

    SYLLABUS_CLOS: (syllabusId: string) => `${environment.serverUrl}api/v1/syllabi/${syllabusId}/clos`,
    CLO_DETAIL: (id: string) => `${environment.serverUrl}api/v1/clos/${id}`,

    SYLLABUS_CLO_PI_LINKS: (syllabusId: string) => `${environment.serverUrl}api/v1/syllabi/${syllabusId}/clo-pi-links`,
    SYLLABUS_CLO_PI_MATRIX: (syllabusId: string) => `${environment.serverUrl}api/v1/syllabi/${syllabusId}/clo-pi-matrix`,
    CLO_PI_LINK_DETAIL: (id: string) => `${environment.serverUrl}api/v1/clo-pi-links/${id}`,

    // F05a - Lớp học phần, ghi danh, nhập danh sách lớp (API-CONTRACT.md §6.4)
    SECTIONS: environment.serverUrl + 'api/v1/sections',
    SECTION_IMPORT_TEMPLATE: environment.serverUrl + 'api/v1/sections/import-template',
    SECTION_IMPORT: environment.serverUrl + 'api/v1/sections/import',
    SECTION_DETAIL: (id: string) => `${environment.serverUrl}api/v1/sections/${id}`,
    SECTION_ASSESSMENT_ALIGNMENT: (sectionId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/assessment-alignment`,
    SECTION_STATUS: (id: string) => `${environment.serverUrl}api/v1/sections/${id}/status`,
    SECTION_ENROLLMENTS: (sectionId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/enrollments`,
    SECTION_ENROLLMENT_IMPORT: (sectionId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/enrollments/import`,
    SECTION_ENROLLMENT_IMPORT_TEMPLATE: (sectionId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/enrollments/import-template`,
    ENROLLMENT_BULK_IMPORT_TEMPLATE: environment.serverUrl + 'api/v1/enrollments/import-template',
    ENROLLMENT_BULK_IMPORT: environment.serverUrl + 'api/v1/enrollments/import',
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
    ASSESSMENT_SCORES: (id: string) => `${environment.serverUrl}api/v1/assessments/${id}/scores`,

    // F05b - Lô nhập điểm thi 3-bước (ADR 0014, Schema v0.7)
    IMPORT_BATCH_CREATE: (sectionId: string, assessmentId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/assessments/${assessmentId}/import-batches`,
    IMPORT_BATCH_LIST: (sectionId: string, assessmentId: string) => `${environment.serverUrl}api/v1/sections/${sectionId}/assessments/${assessmentId}/import-batches`,
    IMPORT_BATCH_DETAIL: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}`,
    IMPORT_BATCH_ERRORS: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}/errors`,
    IMPORT_BATCH_VALIDATE: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}/validate`,
    IMPORT_BATCH_CONFIRM: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}/confirm`,
    IMPORT_BATCH_ROLLBACK: (id: string) => `${environment.serverUrl}api/v1/import-batches/${id}/rollback`,

    // F06 - Engine đo lường chuẩn đầu ra 4 cấp độ
    CALCULATION_RUNS: environment.serverUrl + 'api/v1/calculation-runs',
    CALCULATION_RUN_DETAIL: (id: string) => `${environment.serverUrl}api/v1/calculation-runs/${id}`,
    CALCULATION_RUN_STUDENT_RESULTS: (id: string) => `${environment.serverUrl}api/v1/calculation-runs/${id}/student-results`,
    CALCULATION_RUN_AGGREGATE_RESULTS: (id: string) => `${environment.serverUrl}api/v1/calculation-runs/${id}/aggregate-results`,

    // F07 - Báo cáo QA & Truy vết ngược
    REPORTS: environment.serverUrl + 'api/v1/reports',
    REPORT_DETAIL: (id: string) => `${environment.serverUrl}api/v1/reports/${id}`,
    REPORT_EXPORT: (id: string) => `${environment.serverUrl}api/v1/reports/${id}/export`,
    TRACE_STUDENT_RESULT: (id: string) => `${environment.serverUrl}api/v1/trace/student-results/${id}`,
    TRACE_SCORE: (id: string) => `${environment.serverUrl}api/v1/trace/scores/${id}`,
    ANALYTICS: environment.serverUrl + 'api/v1/reports/analytics',
    ANALYTICS_EXPORT: environment.serverUrl + 'api/v1/reports/analytics/export',

    // F01 - Nhật ký thao tác (chỉ ADMIN)
    AUDIT_LOGS: environment.serverUrl + 'api/v1/audit-logs',

    // Categories
    DEMO_API: environment.serverUrl + 'rest/demo',
  },

  ROUTE: {
    AUTH: {
      LOGIN: '/auth/login',
      CHANGE_PASSWORD: '/auth/change-password',
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

      FACULTIES: '/mng/faculties',

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
      SECTION_ASSESSMENT_ALIGNMENT: (sectionId: string) => `/mng/sections/${sectionId}/assessment-alignment`,

      ASSESSMENTS_OF_SECTION: (sectionId: string) => `/mng/assessments/sections/${sectionId}`,
      ASSESSMENT_TEMPLATES: (syllabusId: string) => `/mng/assessments/syllabi/${syllabusId}`,
      ASSESSMENT_DETAIL: (assessmentId: string) => `/mng/assessments/${assessmentId}`,
      ASSESSMENT_REVIEW: (assessmentId: string) => `/mng/assessments/${assessmentId}/review`,
      ASSESSMENT_SCORE_IMPORT: (assessmentId: string) => `/mng/assessments/${assessmentId}/score-import`,
      ASSESSMENT_IMPORT_BATCHES: (assessmentId: string) => `/mng/assessments/${assessmentId}/import-batches`,
      ASSESSMENT_SCORES: (assessmentId: string) => `/mng/assessments/${assessmentId}/scores`,

      CALCULATIONS: '/mng/calculations',
      REPORTS: '/mng/reports',
      ANALYTICS: '/mng/analytics',
      AUDIT_LOGS: '/mng/audit-logs',

      CATEGORIES: '/mng/categories',
      ACADEMIC_RANKS: '/mng/categories/academic-ranks',

      SETTINGS: '/mng/settings',
      COMMON_SETTINGS: '/mng/settings/common',
    },
  },
};
