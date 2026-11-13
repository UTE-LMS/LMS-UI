import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import {
  IAssessment,
  IAssessmentItemsRequest,
  IAssessmentRequest,
  IAssessmentUpdateRequest,
  ICoverage,
} from '@models/assessment/assessment.model';
import { Observable } from 'rxjs';

/**
 * Bài đánh giá (F04 US-15, US-16, NEW-01, ADR 0014).
 * Khung theo đề cương do LECTURER/PROGRAM_MANAGER trong phạm vi soạn;
 * bản lớp do LECTURER của lớp soạn và quản lý khóa/mở khóa ma trận.
 */
@Injectable({
  providedIn: 'root',
})
export class AssessmentService {
  private readonly http = inject(HttpClient);

  getTemplates(syllabusId: string): Observable<IAssessment[]> {
    return this.http.get<IAssessment[]>(UrlConstant.API.SYLLABUS_ASSESSMENT_TEMPLATES(syllabusId), {
      context: this.inlineErrors(),
    });
  }

  createTemplate(syllabusId: string, model: IAssessmentRequest): Observable<IAssessment> {
    return this.http.post<IAssessment>(UrlConstant.API.SYLLABUS_ASSESSMENT_TEMPLATES(syllabusId), model, {
      context: this.inlineErrors(),
    });
  }

  getSectionAssessments(sectionId: string): Observable<IAssessment[]> {
    return this.http.get<IAssessment[]>(UrlConstant.API.SECTION_ASSESSMENTS(sectionId), {
      context: this.inlineErrors(),
    });
  }

  /** Tạo bản lớp; có `templateId` thì sao chép items từ khung (snapshot) và không được gửi kèm `items`. */
  createSectionAssessment(sectionId: string, model: IAssessmentRequest): Observable<IAssessment> {
    return this.http.post<IAssessment>(UrlConstant.API.SECTION_ASSESSMENTS(sectionId), model, {
      context: this.inlineErrors(),
    });
  }

  getAssessment(id: string): Observable<IAssessment> {
    return this.http.get<IAssessment>(UrlConstant.API.ASSESSMENT_DETAIL(id), { context: this.inlineErrors() });
  }

  updateAssessment(id: string, model: IAssessmentUpdateRequest): Observable<IAssessment> {
    return this.http.put<IAssessment>(UrlConstant.API.ASSESSMENT_DETAIL(id), model, { context: this.inlineErrors() });
  }

  /** Thay TOÀN BỘ items[]; bị từ chối (422) khi cấu trúc đã khóa (LOCKED hoặc SCORE_ENTERED). */
  replaceItems(id: string, model: IAssessmentItemsRequest): Observable<IAssessment> {
    return this.http.put<IAssessment>(UrlConstant.API.ASSESSMENT_ITEMS(id), model, { context: this.inlineErrors() });
  }

  getCoverage(id: string): Observable<ICoverage> {
    return this.http.get<ICoverage>(UrlConstant.API.ASSESSMENT_COVERAGE(id), { context: this.inlineErrors() });
  }

  /** Khóa ma trận đánh giá: DRAFT -> LOCKED */
  lock(id: string): Observable<IAssessment> {
    return this.http.post<IAssessment>(UrlConstant.API.ASSESSMENT_LOCK(id), null, { context: this.inlineErrors() });
  }

  /** Mở lại ma trận để chỉnh sửa: LOCKED -> DRAFT (chỉ khi chưa nhập điểm) */
  unlock(id: string): Observable<IAssessment> {
    return this.http.post<IAssessment>(UrlConstant.API.ASSESSMENT_UNLOCK(id), null, { context: this.inlineErrors() });
  }

  deleteAssessment(id: string): Observable<void> {
    return this.http.delete<void>(UrlConstant.API.ASSESSMENT_DETAIL(id), { context: this.inlineErrors() });
  }

  private inlineErrors(): HttpContext {
    return new HttpContext().set(INLINE_ERRORS, true);
  }
}
