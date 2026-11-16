export interface IFaculty {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  /** Backend Jackson serializes Lombok `boolean isActive` getter `isActive()` as `active` in JSON */
  active?: boolean;
  programManagerCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IFacultyRequest {
  code: string;
  name: string;
  description?: string;
}

export interface IFacultyUpdateRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface IFacultyStatusUpdateRequest {
  isActive: boolean;
  reason?: string;
}

export interface IFacultyAssignPmRequest {
  userId: string;
}

export interface IFacultyTransferPmRequest {
  userId: string;
  targetFacultyId: string;
  transferReason: string;
}
