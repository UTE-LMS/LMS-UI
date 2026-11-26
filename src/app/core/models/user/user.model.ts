/** 4 vai trò cốt lõi của backend (OBE v0.7 / ADR 0014). */
export type Role = 'ADMIN' | 'PROGRAM_MANAGER' | 'LECTURER' | 'QA';
export type UserRole = Role;

/** Trạng thái tài khoản: ACTIVE cho phép đăng nhập, LOCKED bị khóa (§5.3.5). */
export type UserStatus = 'ACTIVE' | 'LOCKED';

/** Body của POST /api/v1/users (CreateUserRequest). */
export interface IUserCreateDTO {
  username: string;
  email: string;
  password: string;
  fullName: string;
  facultyId?: string | null;
  roles: Role[];
}

/** Body của PUT /api/v1/users/{id}: không có username và password (UpdateUserRequest). */
export type IUserUpdateDTO = Omit<IUserCreateDTO, 'username' | 'password'>;

/** Body của PUT /api/v1/users/{id}/status (UpdateUserStatusRequest). */
export interface IUserStatusDTO {
  status: UserStatus;
}

/** UserResponse: phản hồi của list/create/get/update/status. Không bao giờ có passwordHash. */
export interface IUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  status: UserStatus;
  facultyId?: string | null;
  facultyCode?: string | null;
  facultyName?: string | null;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}
