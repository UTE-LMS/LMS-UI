import { AssessmentType } from '@models/assessment/assessment.model';

export type CalculationScope = 'SECTION' | 'COHORT' | 'PROGRAM';
export type CalculationStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
export type ResultLevel = 'ASSESSMENT_CLO' | 'CLO' | 'PI' | 'PLO';
export type ResultStatus = 'COMPUTED' | 'INSUFFICIENT_DATA' | 'NOT_APPLICABLE';
export type ReportType = 'SECTION_CLO' | 'COURSE_PI' | 'PROGRAM_PLO' | 'DATA_COMPLETENESS';
export type ReportExportFormat = 'csv' | 'xlsx';

export interface CalculationRunRequest {
  scope: CalculationScope;
  programVersionId?: string | null;
  sectionIds?: string[];
  courseIds?: string[];
  cohorts?: string[];
  termId?: string | null;
  official: boolean;
}

export interface CalculationRunResponse {
  id: string;
  scope: CalculationScope;
  scopeRef?: {
    sectionIds?: string[];
    courseIds?: string[];
    cohorts?: string[];
    termId?: string;
  };
  lockKey: string;
  programVersionId?: string;
  programCode?: string | null;
  programName?: string | null;
  programVersion?: string | null;
  termCode?: string | null;
  sectionCodes?: string[];
  courseCode?: string | null;
  courseName?: string | null;
  syllabusIds?: string[];
  official: boolean;
  stale: boolean;
  staleReason?: string;
  status: CalculationStatus;
  errorMessage?: string;
  triggeredBy?: string;
  startedAt?: string;
  finishedAt?: string;
  studentResultCount: number;
  aggregateResultCount: number;
}

export interface StudentResultResponse {
  id: string;
  runId: string;
  level: ResultLevel;
  subjectId: string;
  subjectCode?: string;
  sectionId?: string;
  sectionCode?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
  assessmentId?: string;
  assessmentName?: string | null;
  assessmentType?: AssessmentType | null;
  studentId: string;
  studentCode?: string;
  termId?: string;
  termCode?: string | null;
  status: ResultStatus;
  value?: number;
  passThreshold?: number;
  passed?: boolean;
  completeness?: {
    requiredCount: number;
    availableCount: number;
    ratio: number;
  };
  programVersionId?: string;
  programCode?: string | null;
  programName?: string | null;
  programVersion?: string | null;
  syllabusId?: string;
}

export interface AggregateResultResponse {
  id: string;
  runId: string;
  level: ResultLevel;
  subjectId: string;
  subjectCode?: string;
  sectionId?: string;
  sectionCode?: string | null;
  courseCode?: string | null;
  courseName?: string | null;
  assessmentId?: string;
  assessmentName?: string | null;
  assessmentType?: AssessmentType | null;
  scope?: {
    type: string;
    refId: string;
    cohort?: string;
    termId?: string;
  };
  counts?: {
    enrolled: number;
    passed: number;
    failed: number;
  };
  evaluated: number;
  insufficientData: number;
  mean?: number;
  passRate?: number;
  passRateOfEnrolled?: number;
  passThreshold?: number;
  dataCompleteness?: number;
  termCode?: string | null;
  programVersionId?: string;
  programCode?: string | null;
  programName?: string | null;
  programVersion?: string | null;
}

export interface ReportCreateRequest {
  type: ReportType;
  runId: string;
  title?: string;
  sectionId?: string;
  courseId?: string;
  cohort?: string;
}

export interface ReportExportItem {
  format: string;
  fileRef: string;
  generatedAt: string;
}

export interface ReportSummaryRow {
  level: ResultLevel;
  subjectId: string;
  subjectCode: string;
  sectionId?: string;
  assessmentId?: string;
  enrolled: number;
  evaluated: number;
  passed: number;
  failed: number;
  insufficientData: number;
  mean?: number;
  passRate?: number;
  passRateOfEnrolled?: number;
  passThreshold?: number;
  dataCompleteness?: number;
}

export interface ReportResponse {
  id: string;
  type: ReportType;
  title: string;
  params?: Record<string, unknown>;
  runId: string;
  programVersionId?: string;
  summary: {
    runId?: string;
    scope?: string;
    isOfficial?: boolean;
    isStale?: boolean;
    items?: ReportSummaryRow[];
    hasIncompleteData?: boolean;
    totalRecords?: number;
    computedRecords?: number;
    insufficientRecords?: number;
    dataCompleteness?: number;
    missingEntries?: {
      studentResultId: string;
      studentId: string;
      studentCode: string;
      level: string;
      subjectId: string;
      sectionId?: string;
      status: string;
      reason: string;
    }[];
  };
  limitations?: string;
  exports?: ReportExportItem[];
  generatedBy?: string;
  createdAt?: string;
}

export interface StudentResultTraceResponse {
  id: string;
  runId: string;
  level: ResultLevel;
  subjectId: string;
  subjectCode?: string;
  studentId: string;
  studentCode?: string;
  status: ResultStatus;
  value?: number;
  passThreshold?: number;
  passed?: boolean;
  inputs: {
    sourceType: 'SCORE' | 'STUDENT_RESULT';
    refId: string;
    label: string;
    normalizedValue?: number;
    weight?: number;
  }[];
}

export interface ScoreTraceResponse {
  scoreId: string;
  sectionId: string;
  assessmentId: string;
  itemId: string;
  itemCode?: string;
  cloId: string;
  cloCode?: string;
  studentId: string;
  studentCode?: string;
  rawScore?: number;
  maxScore?: number;
  importBatchId?: string;
  sourceRow?: number;
  fileName?: string;
  sourceSystem?: string;
  importedBy?: string;
  importedAt?: string;
}

/** Tham số lọc & phân trang cho GET /api/v1/calculation-runs/{id}/student-results. */
export interface IStudentResultQuery {
  level?: ResultLevel;
  sectionId?: string;
  assessmentId?: string;
  studentId?: string;
  subjectId?: string;
  passed?: boolean;
  page?: number;
  size?: number;
}
