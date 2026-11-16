export interface IProgram {
  id: string;
  code: string;
  name: string;
  level: string;
  degree: string;
  facultyId?: string;
  facultyCode?: string;
  facultyName?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IProgramRequest {
  code: string;
  name: string;
  level: string;
  degree: string;
  facultyId?: string;
  isActive?: boolean;
}

export * from './program-version.model';
export * from './program-verification.model';
export * from './plo-pi.model';
