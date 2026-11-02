/** Trạng thái xác nhận nghiệp vụ (GiaiThich_CoSoDuLieu.md, khối dùng lại `verification`). Đủ ba giá trị theo tài liệu. */
export type VerificationStatus = 'UNVERIFIED' | 'NEEDS_CLARIFICATION' | 'VERIFIED';

export interface IVerification {
  status: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  note?: string | null;
}
