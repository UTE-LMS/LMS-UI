export type CourseType = 'COMPULSORY' | 'ELECTIVE';

export type CourseCategory =
  | 'FOUNDATION'
  | 'MAJOR_FOUNDATION'
  | 'SPECIALIZED'
  | 'CAPSTONE_PROJECT'
  | 'THESIS';

export interface ICourse {
  id: string;
  code: string;
  name: string;
  credits?: number;
  extra?: Record<string, unknown>;
}

export interface ICourseRequest {
  code: string;
  name: string;
  credits?: number;
  extra?: Record<string, unknown>;
}

export interface ICourseUpdateRequest {
  name: string;
  credits?: number;
  extra?: Record<string, unknown>;
}

export interface IProgramCourse {
  id: string;
  programVersionId: string;
  courseId: string;
  course?: ICourse;
  semester?: number;
  credits?: number;
  type?: CourseType;
  category?: CourseCategory;
  prerequisiteCourseIds?: string[];
  previousCourseIds?: string[];
}

export interface IProgramCourseRequest {
  courseId: string;
  semester?: number;
  credits?: number;
  type: CourseType;
  category?: CourseCategory;
  prerequisiteCourseIds?: string[];
  previousCourseIds?: string[];
}

export interface IProgramCourseUpdateRequest {
  semester?: number;
  credits?: number;
  type: CourseType;
  category?: CourseCategory;
  prerequisiteCourseIds?: string[];
  previousCourseIds?: string[];
}

export interface IAssignCourseRequest {
  courseId: string;
  lecturerId: string;
}

export interface ICourseImportRowError {
  row: number;
  code?: string;
  message: string;
}

export interface ICourseImportResultResponse {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: ICourseImportRowError[];
}

