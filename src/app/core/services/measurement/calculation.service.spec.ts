import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { CalculationService } from './calculation.service';

describe('CalculationService', () => {
  let service: CalculationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CalculationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should trigger calculation run via POST', () => {
    service.triggerCalculation({ scope: 'SECTION', sectionIds: ['s1'], official: true }).subscribe();
    const req = httpMock.expectOne(UrlConstant.API.CALCULATION_RUNS);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as { scope: string; }).scope).toBe('SECTION');
    req.flush({ id: 'run1', status: 'SUCCESS' });
  });

  it('should fetch paginated calculation runs', () => {
    service.getCalculationRuns('pv1', 1, 10).subscribe(res => {
      expect(res.totalElements).toBe(1);
    });
    const req = httpMock.expectOne(
      r => r.url === UrlConstant.API.CALCULATION_RUNS
        && r.params.get('programVersionId') === 'pv1'
        && r.params.get('page') === '1'
        && r.params.get('size') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [{ id: 'run1' }], page: 1, size: 10, totalElements: 1, totalPages: 1, last: true });
  });

  it('should fetch paginated aggregate results filtered by level', () => {
    service.getAggregateResults('run1', 'PLO', undefined, 0, 20).subscribe(res => {
      expect(res.content).toEqual([]);
    });
    const req = httpMock.expectOne(
      r => r.url === UrlConstant.API.CALCULATION_RUN_AGGREGATE_RESULTS('run1')
        && r.params.get('level') === 'PLO'
        && r.params.get('page') === '0'
        && r.params.get('size') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
  });

  it('should fetch paginated student results with filters and handle 400 error', () => {
    service.getStudentResults('run1', {
      level: 'CLO',
      subjectId: 'clo1',
      studentId: 'stu1',
      passed: false,
      page: 0,
      size: 50,
    }).subscribe();
    const req = httpMock.expectOne(
      r => r.url === UrlConstant.API.CALCULATION_RUN_STUDENT_RESULTS('run1')
        && r.params.get('level') === 'CLO'
        && r.params.get('subjectId') === 'clo1'
        && r.params.get('studentId') === 'stu1'
        && r.params.get('passed') === 'false'
        && r.params.get('size') === '50',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, last: true });

    let status = 0;
    service.getStudentResults('run1', { page: -1, size: 200 }).subscribe({
      error: (err: { status: number; }) => { status = err.status; },
    });
    const badReq = httpMock.expectOne(r => r.url === UrlConstant.API.CALCULATION_RUN_STUDENT_RESULTS('run1'));
    badReq.flush({ message: 'Kích thước trang tối đa 100' }, { status: 400, statusText: 'Bad Request' });
    expect(status).toBe(400);
  });
});
