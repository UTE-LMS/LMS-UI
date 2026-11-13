import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IAssessmentItem, IAssessmentRequest } from '@models/assessment/assessment.model';
import { AssessmentService } from './assessment.service';

/** DỮ LIỆU THỬ NGHIỆM: ID và mã bài đánh giá giả. */
describe('AssessmentService (F04 US-15, US-16, NEW-01, ADR 0014)', () => {
  let service: AssessmentService;
  let http: HttpTestingController;
  const id = '671dcba5f123456789abcd31';
  const sectionId = '671dcba5f123456789abcd01';
  const syllabusId = '671dcba5f123456789abcd02';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AssessmentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getTemplates: GET /syllabi/{id}/assessment-templates', () => {
    service.getTemplates(syllabusId).subscribe();
    const req = http.expectOne(UrlConstant.API.SYLLABUS_ASSESSMENT_TEMPLATES(syllabusId));
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush([]);
  });

  it('createTemplate: POST body nguyên vẹn', () => {
    const body: IAssessmentRequest = { code: 'GK', name: 'Giữa kỳ' };
    service.createTemplate(syllabusId, body).subscribe();
    const req = http.expectOne(UrlConstant.API.SYLLABUS_ASSESSMENT_TEMPLATES(syllabusId));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('getSectionAssessments: GET /sections/{id}/assessments', () => {
    service.getSectionAssessments(sectionId).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_ASSESSMENTS(sectionId));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('US-15/AC-1: createSectionAssessment gửi templateId mà không kèm items', () => {
    const body: IAssessmentRequest = { code: 'CK', name: 'Cuối kỳ', templateId: '671dcba5f123456789abcd41' };
    service.createSectionAssessment(sectionId, body).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_ASSESSMENTS(sectionId));
    expect(req.request.method).toBe('POST');
    expect((req.request.body as IAssessmentRequest).templateId).toBe('671dcba5f123456789abcd41');
    expect((req.request.body as IAssessmentRequest).items).toBeUndefined();
    req.flush({});
  });

  it('getAssessment: GET /assessments/{id}', () => {
    service.getAssessment(id).subscribe();
    const req = http.expectOne(UrlConstant.API.ASSESSMENT_DETAIL(id));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('updateAssessment: PUT /assessments/{id}', () => {
    service.updateAssessment(id, { name: 'Tên mới' }).subscribe();
    const req = http.expectOne(UrlConstant.API.ASSESSMENT_DETAIL(id));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Tên mới' });
    req.flush({});
  });

  it('US-15/AC-2: replaceItems gửi toàn bộ items kèm outcomeMappings qua PUT /assessments/{id}/items', () => {
    const items: IAssessmentItem[] = [{
      code: 'C1', bloomLevel: 4,
      outcomeMappings: [{ cloId: 'clo1', maxScore: 3 }],
    }];
    service.replaceItems(id, { items }).subscribe();
    const req = http.expectOne(UrlConstant.API.ASSESSMENT_ITEMS(id));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ items });
    req.flush({});
  });

  it('NEW-01/AC-6: getCoverage gọi GET /assessments/{id}/coverage', () => {
    service.getCoverage(id).subscribe();
    const req = http.expectOne(UrlConstant.API.ASSESSMENT_COVERAGE(id));
    expect(req.request.method).toBe('GET');
    req.flush({ totalItemsSum: 0, byClo: [], byBloom: [] });
  });

  it('ADR 0014: lock và unlock gọi POST đúng URL', () => {
    service.lock(id).subscribe();
    const lockReq = http.expectOne(UrlConstant.API.ASSESSMENT_LOCK(id));
    expect(lockReq.request.method).toBe('POST');
    expect(lockReq.request.body).toBeNull();
    lockReq.flush({});

    service.unlock(id).subscribe();
    const unlockReq = http.expectOne(UrlConstant.API.ASSESSMENT_UNLOCK(id));
    expect(unlockReq.request.method).toBe('POST');
    expect(unlockReq.request.body).toBeNull();
    unlockReq.flush({});
  });

  it('deleteAssessment gọi DELETE /assessments/{id}', () => {
    service.deleteAssessment(id).subscribe();
    const delReq = http.expectOne(UrlConstant.API.ASSESSMENT_DETAIL(id));
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
  });
});
