export interface IListFilesPatchId {
  id: string;
  filename?: string;
}

export interface IListFilesPatchFileInfo {
  id: string;
  fileInfo?: IFileInfo | null;
}

export interface IUnifiedFileInfo {
  id: string;
  filename: string;
  fileInfo?: IFileInfo | null;
}

export interface IFileInfo {
  id: string;
  fileType: string;
  fileName: string;
  fileNameEn: string;
  fileSize: number;
  location: string;
}

// Record<string, string | SafeResourceUrl> <=> { [key: string]: type; }
