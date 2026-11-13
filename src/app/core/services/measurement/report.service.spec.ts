import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlConstant } from '@constants/url.constant';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should generate report via POST', () => {
    service.generateReport({ type: 'PROGRAM_PLO', runId: 'run1' }).subscribe();
    const req = httpMock.expectOne(UrlConstant.API.REPORTS);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as { type: string; }).type).toBe('PROGRAM_PLO');
    req.flush({ id: 'rep1', type: 'PROGRAM_PLO' });
  });

  it('should trace student result and score', () => {
    service.traceStudentResult('sr1').subscribe();
    const req1 = httpMock.expectOne(UrlConstant.API.TRACE_STUDENT_RESULT('sr1'));
    expect(req1.request.method).toBe('GET');
    req1.flush({ id: 'sr1', inputs: [] });

    service.traceScore('sc1').subscribe();
    const req2 = httpMock.expectOne(UrlConstant.API.TRACE_SCORE('sc1'));
    expect(req2.request.method).toBe('GET');
    req2.flush({ scoreId: 'sc1' });
  });
});
