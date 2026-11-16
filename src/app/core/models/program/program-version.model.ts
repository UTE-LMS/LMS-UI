import { IVerificationResponse } from './program-verification.model';

export type ProgramVersionStatus = 'ACTIVE' | 'ARCHIVED';

export interface IProgramVersion {
  id: string;
  programId: string;
  version: string;
  totalCredits?: number;
  durationYears?: number;
  applicableCohort?: string;
  status: ProgramVersionStatus;
  verification?: IVerificationResponse;
  facultyId?: string;
  facultyCode?: string;
  facultyName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IProgramVersionRequest {
  programId: string;
  version: string;
  totalCredits?: number;
  durationYears?: number;
  applicableCohort?: string;
}

export interface IProgramVersionUpdateRequest {
  version: string;
  totalCredits?: number;
  durationYears?: number;
  applicableCohort?: string;
}

export interface IProgramVersionStatusUpdateRequest {
  status: ProgramVersionStatus;
}

export interface IProgramCsvImportResponse {
  programVersionId: string;
  programId: string;
  version: string;
  totalCredits?: number | null;
  durationYears?: number | null;
  applicableCohort?: string | null;
  status: ProgramVersionStatus;
  verificationStatus: string;
  ploCount: number;
  piCount: number;
  courseCount: number;
  warnings: string[];
  plos: unknown[];
  pis: unknown[];
}
