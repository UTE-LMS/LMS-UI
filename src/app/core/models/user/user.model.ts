import { SystemConstant } from '@constants/system.constant';

/** 7 giá trị enum vai trò của backend (API-CONTRACT.md §5.3.2). */
export type UserRole = (typeof SystemConstant.ROLE)[keyof typeof SystemConstant.ROLE];

/** Trạng thái tài khoản: ACTIVE cho phép đăng nhập, LOCKED bị khóa (§5.3.5). */
export type UserStatus = 'ACTIVE' | 'LOCKED';

/** Phạm vi của một vai trò. Mảng chứa ObjectId 24 ký tự hex. */
export interface IUserScope {
  programIds: string[];
  courseIds: string[];
  sectionIds: string[];
}

export interface IRoleAssignment {
  role: UserRole;
  scope: IUserScope | null;
}

/** Body của POST /api/v1/users (CreateUserRequest). */
export interface IUserCreateDTO {
  username: string;
  email: string;
  password: string;
  fullName: string;
  roleAssignments: IRoleAssignment[];
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
  roleAssignments: IRoleAssignment[];
  createdAt: string;
  updatedAt: string;
}
