import { IVerificationResponse } from '@models/program/program-verification.model';

export type SyllabusStatus = 'DRAFT' | 'CONFIRMED' | 'ARCHIVED';

export interface ISyllabus {
  id: string;
  courseId: string;
  version: string;
  effectiveFromTermId?: string | null;
  effectiveToTermId?: string | null;
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
