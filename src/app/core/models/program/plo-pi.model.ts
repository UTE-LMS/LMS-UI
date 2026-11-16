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
  passThreshold?: number;
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
  passThreshold?: number;
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
  weight?: number;
  passThreshold?: number;
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
  weight?: number;
  passThreshold?: number;
  reviewNote?: string;
}

export type { ICourse, IProgramCourse } from '@models/course/course.model';
