export interface IAuthData {
  avatar: string;
  token?: string;
  expired: number;
  roles: string[];
  fullName: string;
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
