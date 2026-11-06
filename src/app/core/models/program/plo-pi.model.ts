import { IVerificationResponse } from './program-verification.model';

export type PloCategory = 'GENERAL' | 'SPECIALIZED' | 'UNSPECIFIED';

export interface IPlo {
  id: string;
  programVersionId: string;
  code: string;
  displayOrder: number;
  category?: PloCategory;
  contentOriginal?: string;
  contentSummary?: string;
  capabilityLevelRaw?: number;
  verification?: IVerificationResponse;
  reviewNote?: string;
}

export interface IPloRequest {
  code: string;
  displayOrder: number;
  category?: PloCategory;
  contentOriginal?: string;
  contentSummary?: string;
  capabilityLevelRaw?: number;
  reviewNote?: string;
}

export interface IPi {
  id: string;
  programVersionId: string;
  ploId: string;
  code: string;
  displayOrder: number;
  nameOriginalTerm?: string;
  contentOriginal?: string;
  contentShort?: string;
  capabilityLevelRaw?: number;
  targetPassRate?: number;
  verification?: IVerificationResponse;
  reviewNote?: string;
}

export interface IPiRequest {
  ploId: string;
  code: string;
  displayOrder: number;
  nameOriginalTerm?: string;
  contentOriginal?: string;
  contentShort?: string;
  capabilityLevelRaw?: number;
  targetPassRate?: number;
  reviewNote?: string;
}

export type PiContributionType = 'I' | 'R' | 'M';

export interface ICoursePiContribution {
  id: string;
  programVersionId: string;
  courseId: string;
  piId: string;
  contribution: PiContributionType;
  verification?: IVerificationResponse;
}

export interface ICoursePiContributionRequest {
  courseId: string;
  piId: string;
  contribution: PiContributionType;
}

export interface ICourse {
  id: string;
  code: string;
  name: string;
  credits?: number;
}

export interface IProgramCourse {
  id: string;
  programVersionId: string;
  courseId: string;
  course?: ICourse;
  semester?: number;
  credits?: number;
  type?: string;
  category?: string;
  prerequisiteCourseIds?: string[];
  previousCourseIds?: string[];
}
