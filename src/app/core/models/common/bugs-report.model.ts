export interface IBugsReportDTO {
  errorDomain: string;
  errorUrl: string;
  ua: string;
  errorInfo: string;
  otherInfo: string;
  email: string;
}

export interface IBugsReport {
  status: 'success' | 'error' | 'bad_request' | 'invalid_token' | 'rejected' | 'forbidden';
  message: string;
}
