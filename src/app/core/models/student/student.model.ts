export type StudentStatus = 'ACTIVE' | 'SUSPENDED' | 'GRADUATED' | 'DROPPED_OUT';

export interface StudentResponse {
  id: string;
  studentCode: string;
  fullName: string;
  cohort: string;
  status: StudentStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StudentFilter {
  search?: string;
  cohort?: string;
  status?: StudentStatus | null;
}

export interface StudentStatusUpdateRequest {
  status: StudentStatus;
}

export interface StudentBatchStatusUpdateRequest {
  studentIds: string[];
  status: StudentStatus;
}

export interface StudentBatchStatusUpdateResponse {
  requestedCount: number;
  updatedCount: number;
  status: StudentStatus;
  students: StudentResponse[];
}
