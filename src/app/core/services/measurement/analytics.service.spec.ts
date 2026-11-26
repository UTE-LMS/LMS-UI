import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { AnalyticsService } from './analytics.service';

// DỮ LIỆU THỬ NGHIỆM: ID giả, không phải dữ liệu thật.
describe('AnalyticsService (F07/US-36)', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('AC-1: gửi dimension và lặp khóa cho mảng (termIds=a&termIds=b), bỏ trường rỗng', () => {
    service.getMatrix({ dimension: 'TIME_TERM', courseId: 'c1', termIds: ['t1', 't2'], sectionIds: [], runId: undefined })
      .subscribe();
    const req = httpMock.expectOne(r => r.url === UrlConstant.API.ANALYTICS);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('dimension')).toBe('TIME_TERM');
    expect(req.request.params.get('courseId')).toBe('c1');
    expect(req.request.params.getAll('termIds')).toEqual(['t1', 't2']);
    expect(req.request.params.has('sectionIds')).toBe(false);
    expect(req.request.params.has('runId')).toBe(false);
    req.flush({ dimension: 'TIME_TERM', columns: [], rows: [], matrix: [], isOfficial: false, isStale: false });
  });

  it('AC-2: xuất CSV loại bỏ page và size nhưng giữ nguyên search/bộ lọc', () => {
    service.exportCsv({ dimension: 'STUDENT', cohorts: ['K22'], page: 2, size: 20, search: '  SV001  ' }).subscribe(res => {
      expect(res.body).toBeInstanceOf(Blob);
    });
    const req = httpMock.expectOne(r => r.url === UrlConstant.API.ANALYTICS_EXPORT);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('format')).toBe('csv');
    expect(req.request.params.getAll('cohorts')).toEqual(['K22']);
    expect(req.request.params.get('search')).toBe('SV001');
    expect(req.request.params.has('page')).toBe(false);
    expect(req.request.params.has('size')).toBe(false);
    req.flush(new Blob(['a,b'], { type: 'text/csv' }));
  });

  it('xuất Excel gửi format=xlsx và loại bỏ page/size nhưng giữ nguyên bộ lọc', () => {
    service.exportExcel({ dimension: 'STUDENT', cohorts: ['K22'], page: 1, size: 20, search: 'SV002' }).subscribe(res => {
      expect(res.body).toBeInstanceOf(Blob);
    });
    const req = httpMock.expectOne(r => r.url === UrlConstant.API.ANALYTICS_EXPORT);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('format')).toBe('xlsx');
    expect(req.request.params.getAll('cohorts')).toEqual(['K22']);
    expect(req.request.params.get('search')).toBe('SV002');
    expect(req.request.params.has('page')).toBe(false);
    expect(req.request.params.has('size')).toBe(false);
    req.flush(new Blob(['pk'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  });

  it('getMatrix gửi page, size và search cho chiều STUDENT', () => {
    service.getMatrix({ dimension: 'STUDENT', page: 1, size: 20, search: '  Nguyen ' }).subscribe();
    const req = httpMock.expectOne(r => r.url === UrlConstant.API.ANALYTICS);
    expect(req.request.params.get('dimension')).toBe('STUDENT');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('search')).toBe('Nguyen');
    req.flush({ dimension: 'STUDENT', columns: [], rows: [], matrix: [], isOfficial: false, isStale: false, page: 1, size: 20, totalElements: 0, totalPages: 0, last: true });
  });
});
