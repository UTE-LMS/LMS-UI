import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { UrlConstant } from '@constants/url.constant';
import { IVerificationRequest } from '@models/program/program-verification.model';
import { ProgramVerificationService } from './program-verification.service';

describe('ProgramVerificationService (F02 US-08, ADR 0004 QA Officer Verification)', () => {
  let service: ProgramVerificationService;
  let httpMock: HttpTestingController;
  const versionId = '671dcba5f123456789abcdef';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProgramVerificationService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProgramVerificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('xác thực phiên bản CTĐT gửi PUT request', () => {
    const payload: IVerificationRequest = {
      status: 'VERIFIED',
      note: 'Đã đối chiếu với quyết định ban hành của Hiệu trưởng',
    };

    service.verifyVersion(versionId, payload).subscribe(res => {
      expect(res.verification?.status).toBe('VERIFIED');
    });

    const req = httpMock.expectOne(UrlConstant.API.PROGRAM_VERSION_VERIFY(versionId));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: versionId, verification: { ...payload } });
  });

  it('xác thực PLO gửi PUT request', () => {
    const payload: IVerificationRequest = { status: 'VERIFIED' };
    service.verifyPlo(versionId, 'plo_1', payload).subscribe();

    const req = httpMock.expectOne(UrlConstant.API.PLO_VERIFY(versionId, 'plo_1'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 'plo_1', verification: { status: 'VERIFIED' } });
  });

  it('xác thực PI gửi PUT request', () => {
    const payload: IVerificationRequest = { status: 'NEEDS_CLARIFICATION', note: 'Chưa có tỷ lệ đạt' };
    service.verifyPi(versionId, 'pi_1', payload).subscribe();

    const req = httpMock.expectOne(UrlConstant.API.PI_VERIFY(versionId, 'pi_1'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 'pi_1', verification: payload });
  });
});
