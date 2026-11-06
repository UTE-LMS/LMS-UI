export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'NEEDS_CLARIFICATION';

export interface IVerificationResponse {
  status: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  note?: string;
}

export interface IVerificationRequest {
  status: VerificationStatus;
  note?: string;
}
