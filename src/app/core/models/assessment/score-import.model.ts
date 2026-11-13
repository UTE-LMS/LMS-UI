export type ImportBatchStatus =
  | 'UPLOADED'
  | 'VALIDATED'
  | 'HAS_ERRORS'
  | 'CONFIRMED'
  | 'ROLLED_BACK';

export type ImportSourceSystem =
  | 'MOODLE'
  | 'CANVAS'
  | 'GOOGLE_CLASSROOM'
  | 'SPREADSHEET'
  | 'CUSTOM';

export type ReimportPolicy = 'SKIP_EXISTING' | 'OVERWRITE';

export interface IImportColumnMappingItem {
  column: string;
  item: string;
  cloId?: string;
}

export interface IImportColumnMapping {
  studentColumn: string;
  items: IImportColumnMappingItem[];
}

export interface IImportBatchStats {
  totalRows: number;
  validRows: number;
  errorRows: number;
  scoreCount: number;
}

export interface IImportBatch {
  id: string;
  sectionId: string;
  assessmentId: string;
  fileName: string;
  fileChecksum?: string;
  fileRef?: string;
  sourceSystem?: ImportSourceSystem;
  columnMapping?: IImportColumnMapping;
  reimportPolicy?: ReimportPolicy;
  status: ImportBatchStatus;
  stats?: IImportBatchStats;
  uploadedBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface IImportRowError {
  rowNumber: number;
  column?: string;
  errorType: string;
  rawValue?: string;
  message: string;
}
