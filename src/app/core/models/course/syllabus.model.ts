import { IVerificationResponse } from '@models/program/program-verification.model';

export type SyllabusStatus = 'CONFIRMED' | 'ARCHIVED';

export interface ISyllabus {
  id: string;
  courseId: string;
  version: string;
  programVersionId?: string;
  courseCode?: string | null;
  courseName?: string | null;
  effectiveFromTermId?: string | null;
  effectiveFromTermCode?: string | null;
  effectiveToTermId?: string | null;
  effectiveToTermCode?: string | null;
  status: SyllabusStatus;
  verification?: IVerificationResponse;
  extra?: Record<string, unknown>;
}

export interface ISyllabusRequest {
  version: string;
  effectiveFromTermId?: string | null;
  effectiveToTermId?: string | null;
  extra?: Record<string, unknown>;
}

export interface ISyllabusStatusUpdateRequest {
  status: SyllabusStatus;
}

export interface ISyllabusCsvImportResponse {
  syllabusId: string;
  courseId: string;
  version: string;
  status: SyllabusStatus;
  verificationStatus: string;
  cloCount: number;
  linkCount: number;
  warnings: string[];
  clos: { id: string; code: string; bloomLevel: number; contentOriginal?: string | null; }[];
  links: unknown[];
}
