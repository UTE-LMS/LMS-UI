import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS, REQUEST_TIMEOUT_MS } from '@interceptors/http-context.token';
import { ICsvImportResultResponse } from '@models/common/response-data.model';
import { IAssessmentAlignmentResponse } from '@models/assessment/assessment.model';
import {
  ISection,
  ISectionRequest,
  ISectionStatusUpdateRequest,
  ISectionUpdateRequest,
} from '@models/course/section.model';
import { IUser } from '@models/user/user.model';
import { map, Observable } from 'rxjs';
import { ImportTemplateFormat, templateRequestParams } from '@services/common/import-file.util';

/**
 * Lớp học phần (F05a US-19). Backend: GET /sections không phân trang và chỉ trả lớp người gọi đọc/quản lý
 * được; mở/sửa/đổi trạng thái lớp do ADMIN hoặc PROGRAM_MANAGER đúng phạm vi CTĐT (ẩn nút ở UI chỉ để tiện dùng).
 */
@Injectable({
  providedIn: 'root',
})
export class SectionService {
  private readonly http = inject(HttpClient);

  getSections(termId?: string, courseId?: string): Observable<ISection[]> {
    let params = new HttpParams();
    if (termId) {
      params = params.set('termId', termId);
    }
    if (courseId) {
      params = params.set('courseId', courseId);
    }
    return this.http.get<ISection[]>(UrlConstant.API.SECTIONS, { params, context: this.inlineErrors() });
  }

  getSection(id: string): Observable<ISection> {
    return this.http.get<ISection>(UrlConstant.API.SECTION_DETAIL(id), { context: this.inlineErrors() });
  }

  /** Danh sách giảng viên phục vụ hiển thị tên & chọn giảng viên mở lớp; có thể lọc theo Khoa qua `facultyId`. */
  getLecturers(facultyId?: string): Observable<IUser[]> {
    let params = new HttpParams();
    const trimmed = facultyId?.trim();
    if (trimmed) {
      params = params.set('facultyId', trimmed);
    }
    return this.http
      .get<IUser[] | { content?: IUser[]; }>(UrlConstant.API.SECTION_LECTURERS, { params, context: this.inlineErrors() })
      .pipe(map(res => (Array.isArray(res) ? res : (res?.content ?? []))));
  }

  createSection(model: ISectionRequest): Observable<ISection> {
    return this.http.post<ISection>(UrlConstant.API.SECTIONS, model, { context: this.inlineErrors() });
  }

  /** Chỉ đổi được danh sách giảng viên; học phần, đề cương, học kỳ của lớp là bất biến (F05a D3). */
  updateLecturers(id: string, model: ISectionUpdateRequest): Observable<ISection> {
    return this.http.put<ISection>(UrlConstant.API.SECTION_DETAIL(id), model, { context: this.inlineErrors() });
  }

  updateStatus(id: string, model: ISectionStatusUpdateRequest): Observable<ISection> {
    return this.http.put<ISection>(UrlConstant.API.SECTION_STATUS(id), model, { context: this.inlineErrors() });
  }

  downloadImportTemplate(format: ImportTemplateFormat = 'csv'): Observable<Blob> {
    return this.http.get(UrlConstant.API.SECTION_IMPORT_TEMPLATE, {
      responseType: 'blob',
      params: templateRequestParams(format),
      context: this.inlineErrors(),
    });
  }

  importSections(file: File): Observable<ICsvImportResultResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ICsvImportResultResponse>(UrlConstant.API.SECTION_IMPORT, formData, {
      context: this.inlineErrors().set(REQUEST_TIMEOUT_MS, 0),
    });
  }

  getAssessmentAlignment(sectionId: string): Observable<IAssessmentAlignmentResponse> {
    return this.http.get<IAssessmentAlignmentResponse>(
      UrlConstant.API.SECTION_ASSESSMENT_ALIGNMENT(sectionId),
      { context: this.inlineErrors() },
    );
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
