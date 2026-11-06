import { IVerificationResponse } from './program-verification.model';

export type ProgramVersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface IProgramVersion {
  id: string;
  programId: string;
  version: string;
  totalCredits?: number;
  durationYears?: number;
  applicableCohorts?: string[];
  status: ProgramVersionStatus;
  verification?: IVerificationResponse;
  createdAt?: string;
  updatedAt?: string;
}

export interface IProgramVersionRequest {
  programId: string;
  version: string;
  totalCredits?: number;
  durationYears?: number;
  applicableCohorts?: string[];
}

export interface IProgramVersionUpdateRequest {
  version: string;
  totalCredits?: number;
  durationYears?: number;
  applicableCohorts?: string[];
}

export interface IProgramVersionStatusUpdateRequest {
  status: ProgramVersionStatus;
}
