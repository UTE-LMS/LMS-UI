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

  it('AC-2: xuất CSV dùng cùng tham số và nhận blob kèm header', () => {
    service.exportCsv({ dimension: 'COHORT', cohorts: ['K22'] }).subscribe(res => {
      expect(res.body).toBeInstanceOf(Blob);
    });
    const req = httpMock.expectOne(r => r.url === UrlConstant.API.ANALYTICS_EXPORT);
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.getAll('cohorts')).toEqual(['K22']);
    req.flush(new Blob(['a,b'], { type: 'text/csv' }));
  });
});
