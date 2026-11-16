import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ICsvImportResultResponse, IPagedResults } from '@models/common/response-data.model';
import {
  IFaculty,
  IFacultyAssignPmRequest,
  IFacultyRequest,
  IFacultyStatusUpdateRequest,
  IFacultyTransferPmRequest,
  IFacultyUpdateRequest,
} from '@models/faculty/faculty.model';
import { IUser } from '@models/user/user.model';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FacultyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.FACULTIES;

  getFaculties(
    page: number,
    size: number,
    search?: string,
    isActive?: boolean,
  ): Observable<IPagedResults<IFaculty>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    const trimmed = search?.trim();
    if (trimmed) {
      params = params.set('search', trimmed);
    }
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
    return this.http.get<IPagedResults<IFaculty>>(this.apiUrl, { params }).pipe(
      map(res => ({
        ...res,
        content: (res.content ?? []).map(item => this.normalizeFaculty(item)),
      })),
    );
  }

  getFacultyById(id: string): Observable<IFaculty> {
    return this.http
      .get<IFaculty>(UrlConstant.API.FACULTY_DETAIL(id), {
        context: this.inlineErrors(),
      })
      .pipe(map(item => this.normalizeFaculty(item)));
  }

  createFaculty(dto: IFacultyRequest): Observable<IFaculty> {
    return this.http
      .post<IFaculty>(this.apiUrl, dto, {
        context: this.inlineErrors(),
      })
      .pipe(map(item => this.normalizeFaculty(item)));
  }

  updateFaculty(id: string, dto: IFacultyUpdateRequest): Observable<IFaculty> {
    return this.http
      .put<IFaculty>(UrlConstant.API.FACULTY_DETAIL(id), dto, {
        context: this.inlineErrors(),
      })
      .pipe(map(item => this.normalizeFaculty(item)));
  }

  updateFacultyStatus(id: string, dto: IFacultyStatusUpdateRequest): Observable<IFaculty> {
    return this.http
      .put<IFaculty>(UrlConstant.API.FACULTY_STATUS(id), dto, {
        context: this.inlineErrors(),
      })
      .pipe(map(item => this.normalizeFaculty(item)));
  }

  getProgramManagers(facultyId: string): Observable<IUser[]> {
    return this.http.get<IUser[]>(UrlConstant.API.FACULTY_PMS(facultyId), {
      context: this.inlineErrors(),
    });
  }

  assignProgramManager(facultyId: string, dto: IFacultyAssignPmRequest): Observable<void> {
    return this.http.post<void>(UrlConstant.API.FACULTY_PMS(facultyId), dto, {
      context: this.inlineErrors(),
    });
  }

  removeProgramManager(facultyId: string, userId: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.FACULTY_PM_DETAIL(facultyId, userId), {
      context: this.inlineErrors(),
    });
  }

  transferProgramManager(dto: IFacultyTransferPmRequest): Observable<void> {
    return this.http.post<void>(UrlConstant.API.FACULTY_TRANSFER_PM, dto, {
      context: this.inlineErrors(),
    });
  }

  downloadImportTemplate(): Observable<Blob> {
    return this.http.get(UrlConstant.API.FACULTY_IMPORT_TEMPLATE, {
      responseType: 'blob',
      context: this.inlineErrors(),
    });
  }

  importFaculties(file: File): Observable<ICsvImportResultResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ICsvImportResultResponse>(UrlConstant.API.FACULTY_IMPORT, formData, {
      context: this.inlineErrors(),
    });
  }

  private normalizeFaculty(item: IFaculty): IFaculty {
    const resolvedActive = item.isActive ?? item.active ?? false;
    return {
      ...item,
      isActive: resolvedActive,
    };
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
