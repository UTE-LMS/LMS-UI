import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { IAssessmentItem, IAssessmentRequest } from '@models/assessment/assessment.model';
import { AssessmentService } from './assessment.service';

/** DỮ LIỆU THỬ NGHIỆM: ID và mã bài đánh giá giả. */
describe('AssessmentService (F04 US-15, US-16, NEW-01)', () => {
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
    const body: IAssessmentRequest = { code: 'GK', name: 'Giữa kỳ', totalPoints: 10 };
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

  it('US-15/AC-1: createSectionAssessment gửi templateId (sao chép từ khung) mà không kèm items', () => {
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

  it('updateAssessment: PUT /assessments/{id} (thay thế toàn phần, không có mã)', () => {
    service.updateAssessment(id, { name: 'Tên mới', totalPoints: 10 }).subscribe();
    const req = http.expectOne(UrlConstant.API.ASSESSMENT_DETAIL(id));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Tên mới', totalPoints: 10 });
    req.flush({});
  });

  it('US-15/AC-2: replaceItems gửi toàn bộ items kèm outcomeMappings và rubric qua PUT /assessments/{id}/items', () => {
    const items: IAssessmentItem[] = [{
      code: 'C1', kind: 'CRITERION', maxScore: 3, bloomLevel: 4,
      outcomeMappings: [{ cloId: 'clo1', weight: 0.5 }, { cloId: 'clo2', weight: 0.5 }],
      rubric: { levels: [{ level: 1, score: 1 }, { level: 4, description: 'Tốt', score: 3 }] },
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

  it('NEW-01/AC-1: submit và approve là POST không body', () => {
    service.submit(id).subscribe();
    const submit = http.expectOne(UrlConstant.API.ASSESSMENT_SUBMIT(id));
    expect(submit.request.method).toBe('POST');
    expect(submit.request.body).toBeNull();
    submit.flush({});

    service.approve(id).subscribe();
    const approve = http.expectOne(UrlConstant.API.ASSESSMENT_APPROVE(id));
    expect(approve.request.method).toBe('POST');
    expect(approve.request.body).toBeNull();
    approve.flush({});
  });

  it('NEW-01/AC-4: reject gửi reviewNote qua POST /assessments/{id}/reject', () => {
    service.reject(id, { reviewNote: 'Câu 2 chưa gắn CLO' }).subscribe();
    const req = http.expectOne(UrlConstant.API.ASSESSMENT_REJECT(id));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reviewNote: 'Câu 2 chưa gắn CLO' });
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });
});
