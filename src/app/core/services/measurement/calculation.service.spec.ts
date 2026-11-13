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

  it('should fetch aggregate results filtered by level', () => {
    service.getAggregateResults('run1', 'PLO').subscribe();
    const req = httpMock.expectOne(
      r => r.url === UrlConstant.API.CALCULATION_RUN_AGGREGATE_RESULTS('run1') && r.params.get('level') === 'PLO',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
