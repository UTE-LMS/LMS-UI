import { IVerificationResponse } from './program-verification.model';

export type ProgramVersionStatus = 'ACTIVE' | 'ARCHIVED';

export interface IProgramVersion {
  id: string;
  programId: string;
  programCode?: string | null;
  programName?: string | null;
  version: string;
  totalCredits?: number;
  durationYears?: number;
  applicableCohort?: string;
  status: ProgramVersionStatus;
  ploCount?: number;
  piCount?: number;
  verification?: IVerificationResponse;
  facultyId?: string;
  facultyCode?: string;
  facultyName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function formatProgramVersionLabel(
  pv: Pick<IProgramVersion, 'version' | 'programCode' | 'programName'>,
): string {
  const code = pv.programCode?.trim();
  if (code) {
    return `${code} · ${pv.version}`;
  }
  const name = pv.programName?.trim();
  if (name) {
    return `${name} · ${pv.version}`;
  }
  return pv.version;
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
