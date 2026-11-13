import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import {
  AggregateResultResponse,
  CalculationRunRequest,
  CalculationRunResponse,
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

  getCalculationRuns(programVersionId?: string): Observable<CalculationRunResponse[]> {
    let params = new HttpParams();
    if (programVersionId) {
      params = params.set('programVersionId', programVersionId);
    }
    return this.http.get<CalculationRunResponse[]>(UrlConstant.API.CALCULATION_RUNS, { params });
  }

  getCalculationRun(id: string): Observable<CalculationRunResponse> {
    return this.http.get<CalculationRunResponse>(UrlConstant.API.CALCULATION_RUN_DETAIL(id));
  }

  getStudentResults(
    runId: string,
    level?: ResultLevel,
    sectionId?: string,
    assessmentId?: string,
  ): Observable<StudentResultResponse[]> {
    let params = new HttpParams();
    if (level) params = params.set('level', level);
    if (sectionId) params = params.set('sectionId', sectionId);
    if (assessmentId) params = params.set('assessmentId', assessmentId);
    return this.http.get<StudentResultResponse[]>(
      UrlConstant.API.CALCULATION_RUN_STUDENT_RESULTS(runId),
      { params },
    );
  }

  getAggregateResults(
    runId: string,
    level?: ResultLevel,
    sectionId?: string,
  ): Observable<AggregateResultResponse[]> {
    let params = new HttpParams();
    if (level) params = params.set('level', level);
    if (sectionId) params = params.set('sectionId', sectionId);
    return this.http.get<AggregateResultResponse[]>(
      UrlConstant.API.CALCULATION_RUN_AGGREGATE_RESULTS(runId),
      { params },
    );
  }
}
