import { IPi } from '@models/program/plo-pi.model';
import { IVerificationResponse } from '@models/program/program-verification.model';

export interface ICloMeasurement {
  defaultWeight?: number | null;
  defaultPassThreshold?: number | null;
}

export interface IClo {
  id: string;
  syllabusId: string;
  courseId: string;
  code: string;
  contentOriginal?: string | null;
  bloomLevel: number;
  bloomNote?: string | null;
  measurement?: ICloMeasurement | null;
  verification?: IVerificationResponse;
  extra?: Record<string, unknown>;
}

export interface ICloRequest {
  code: string;
  contentOriginal?: string | null;
  bloomLevel: number;
  bloomNote?: string | null;
  measurement?: ICloMeasurement | null;
  extra?: Record<string, unknown>;
}

export type ICloUpdateRequest = ICloRequest;

export interface ICloPiLink {
  id: string;
  programVersionId: string;
  syllabusId: string;
  cloId: string;
  piId: string;
  weight?: number | null;
  verification?: IVerificationResponse;
}

export interface ICloPiLinkRequest {
  programVersionId: string;
  cloId: string;
  piId: string;
  weight: number;
}

export interface ICloPiLinkCell {
  cloId: string;
  piId: string;
  linkId: string;
  weight?: number | null;
  verification?: IVerificationResponse;
}

export interface ICloPiMatrix {
  syllabusId: string;
  programVersionId: string;
  clos: IClo[];
  pis: IPi[];
  links: ICloPiLinkCell[];
}
