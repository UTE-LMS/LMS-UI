import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { INLINE_ERRORS } from '@interceptors/http-context.token';
import { ISectionRequest } from '@models/course/section.model';
import { SectionService } from './section.service';

/** DỮ LIỆU THỬ NGHIỆM: ID và mã giả. */
describe('SectionService (F05a US-19)', () => {
  let service: SectionService;
  let http: HttpTestingController;
  const sectionId = '671dcba5f123456789abcd01';

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SectionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('US-19/AC-4: getSections không lọc thì gọi GET /sections không có query', () => {
    service.getSections().subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SECTIONS);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush([]);
  });

  it('getSections gửi termId và courseId làm query khi có lọc', () => {
    service.getSections('t1', 'c1').subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SECTIONS);
    expect(req.request.params.get('termId')).toBe('t1');
    expect(req.request.params.get('courseId')).toBe('c1');
    req.flush([]);
  });

  it('getSections bỏ qua bộ lọc rỗng (chuỗi rỗng không thành query)', () => {
    service.getSections('', undefined).subscribe();
    const req = http.expectOne(r => r.url === UrlConstant.API.SECTIONS);
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('getSection gọi GET /sections/{id}', () => {
    service.getSection(sectionId).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_DETAIL(sectionId));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('US-19/AC-1: createSection gửi đúng body qua POST /sections', () => {
    const body: ISectionRequest = {
      code: 'TEST101-01', courseId: 'c1', syllabusId: 's1', termId: 't1', lecturerIds: ['u1'],
    };
    service.createSection(body).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTIONS);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(INLINE_ERRORS)).toBe(true);
    req.flush({});
  });

  it('updateLecturers chỉ gửi lecturerIds qua PUT /sections/{id}', () => {
    service.updateLecturers(sectionId, { lecturerIds: ['u1', 'u2'] }).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_DETAIL(sectionId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ lecturerIds: ['u1', 'u2'] });
    req.flush({});
  });

  it('updateStatus gửi status và lý do qua PUT /sections/{id}/status', () => {
    service.updateStatus(sectionId, { status: 'OPEN', reason: 'Sửa điểm nhập sai' }).subscribe();
    const req = http.expectOne(UrlConstant.API.SECTION_STATUS(sectionId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'OPEN', reason: 'Sửa điểm nhập sai' });
    req.flush({});
  });
});
