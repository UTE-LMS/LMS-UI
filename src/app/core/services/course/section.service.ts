import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  ISection,
  ISectionRequest,
  ISectionStatusUpdateRequest,
  ISectionUpdateRequest,
} from '@models/course/section.model';
import { Observable } from 'rxjs';

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

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
