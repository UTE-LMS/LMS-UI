import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import {
  ReportCreateRequest,
  ReportResponse,
  ReportType,
  ScoreTraceResponse,
  StudentResultTraceResponse,
} from '@models/measurement/measurement.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);

  generateReport(request: ReportCreateRequest): Observable<ReportResponse> {
    return this.http.post<ReportResponse>(UrlConstant.API.REPORTS, request);
  }

  listReports(
    type?: ReportType,
    programVersionId?: string,
    runId?: string,
  ): Observable<ReportResponse[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    if (programVersionId) params = params.set('programVersionId', programVersionId);
    if (runId) params = params.set('runId', runId);
    return this.http.get<ReportResponse[]>(UrlConstant.API.REPORTS, { params });
  }

  getReport(id: string): Observable<ReportResponse> {
    return this.http.get<ReportResponse>(UrlConstant.API.REPORT_DETAIL(id));
  }

  exportReportCsv(id: string): Observable<Blob> {
    return this.http.post(UrlConstant.API.REPORT_EXPORT(id), null, {
      responseType: 'blob',
    });
  }

  traceStudentResult(studentResultId: string): Observable<StudentResultTraceResponse> {
    return this.http.get<StudentResultTraceResponse>(
      UrlConstant.API.TRACE_STUDENT_RESULT(studentResultId),
    );
  }

  traceScore(scoreId: string): Observable<ScoreTraceResponse> {
    return this.http.get<ScoreTraceResponse>(UrlConstant.API.TRACE_SCORE(scoreId));
  }
}
