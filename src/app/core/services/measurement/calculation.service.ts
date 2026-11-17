import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { IPagedResults } from '@models/common/response-data.model';
import {
  AggregateResultResponse,
  CalculationRunRequest,
  CalculationRunResponse,
  IStudentResultQuery,
  ResultLevel,
  StudentResultResponse,
} from '@models/measurement/measurement.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CalculationService {
  private http = inject(HttpClient);

  triggerCalculation(request: CalculationRunRequest): Observable<CalculationRunResponse> {
    return this.http.post<CalculationRunResponse>(UrlConstant.API.CALCULATION_RUNS, request);
  }

  getCalculationRuns(
    programVersionId?: string,
    page = 0,
    size = 20,
  ): Observable<IPagedResults<CalculationRunResponse>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (programVersionId) {
      params = params.set('programVersionId', programVersionId);
    }
    return this.http.get<IPagedResults<CalculationRunResponse>>(UrlConstant.API.CALCULATION_RUNS, { params });
  }

  getCalculationRun(id: string): Observable<CalculationRunResponse> {
    return this.http.get<CalculationRunResponse>(UrlConstant.API.CALCULATION_RUN_DETAIL(id));
  }

  getStudentResults(
    runId: string,
    query: IStudentResultQuery = {},
  ): Observable<IPagedResults<StudentResultResponse>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 20));
    if (query.level) params = params.set('level', query.level);
    if (query.sectionId) params = params.set('sectionId', query.sectionId);
    if (query.assessmentId) params = params.set('assessmentId', query.assessmentId);
    if (query.studentId) params = params.set('studentId', query.studentId);
    if (query.subjectId) params = params.set('subjectId', query.subjectId);
    if (query.passed !== undefined) params = params.set('passed', String(query.passed));
    return this.http.get<IPagedResults<StudentResultResponse>>(
      UrlConstant.API.CALCULATION_RUN_STUDENT_RESULTS(runId),
      { params },
    );
  }

  getAggregateResults(
    runId: string,
    level?: ResultLevel,
    sectionId?: string,
    page = 0,
    size = 20,
  ): Observable<IPagedResults<AggregateResultResponse>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    if (level) params = params.set('level', level);
    if (sectionId) params = params.set('sectionId', sectionId);
    return this.http.get<IPagedResults<AggregateResultResponse>>(
      UrlConstant.API.CALCULATION_RUN_AGGREGATE_RESULTS(runId),
      { params },
    );
  }
}
