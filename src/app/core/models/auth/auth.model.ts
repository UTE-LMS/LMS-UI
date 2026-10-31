import { IRoleAssignment, UserStatus } from '@models/user/user.model';

/**
 * Dữ liệu phiên đăng nhập lưu ở trình duyệt (không chứa token).
 * `roles` giữ để tương thích code cũ (guard, menu); với F01 nó là tên enum của backend, ví dụ 'ADMIN'.
 * Quyền thật do backend kiểm tra mỗi request, dữ liệu này chỉ để ẩn/hiện giao diện.
 */
export interface IAuthData {
  avatar: string;
  token?: string;
  expired: number;
  roles: string[];
  fullName: string;
  userId?: string;
  username?: string;
  roleAssignments?: IRoleAssignment[];
}

/** UserProfileResponse của GET /api/v1/auth/me (§5.2.3). */
export interface IUserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  status: UserStatus;
  roleAssignments: IRoleAssignment[];
}

/** Body của POST /api/v1/auth/login (LoginRequest, §5.2.1). */
export interface ILoginRequest {
  username: string;
  password: string;
}

/** LoginResponse (§5.2.1). */
export interface ILoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: IUserProfile;
}

export interface IUserGoogle {
  name: string;
  photoUrl: string;
  email: string;
}

export interface IPeopleGoogle {
  resourceName: string;
  names: { displayName: string; metadata: { primary?: boolean; }; }[];
  photos: { url: string; metadata: { primary?: boolean; }; }[];
  emailAddresses: { value: string; metadata: { primary?: boolean; }; }[];
}

export interface ILoginDTO {
  email: string;
  password: string;
  remember: boolean;
}

export interface IRegisterDTO {
  email: string;
  password: string;
  repassword: string;
}

export interface IResetPasswordRequsetDTO {
  email: string;
}

export interface IResetPasswordDTO {
  password: string;
  repassword: string;
}
