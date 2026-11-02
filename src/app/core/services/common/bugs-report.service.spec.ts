import { HttpBackend, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env';
import { IBugsReport, IBugsReportDTO } from '@models/common/bugs-report.model';
import { sha256 } from 'js-sha256';
import { Observable, of } from 'rxjs';
import { BugsReportService } from './bugs-report.service';

/** DỮ LIỆU THỬ NGHIỆM: báo cáo lỗi giả. */
const REPORT: IBugsReportDTO = {
  errorDomain: 'localhost', errorUrl: 'http://localhost/x', ua: 'vitest', errorInfo: '[500] thu nghiem',
  otherInfo: '', email: '',
};

describe('US-40/AC-4: BugsReportService (báo lỗi không lộ thông tin qua giao diện)', () => {
  it('gửi POST text/plain tới địa chỉ cấu hình, kèm timestamp và token = sha256(khóa + timestamp)', async () => {
    const captured: HttpRequest<unknown>[] = [];
    const backend = {
      handle: (req: HttpRequest<unknown>): Observable<HttpResponse<IBugsReport>> => {
        captured.push(req);
        return of(new HttpResponse<IBugsReport>({ status: 200, body: { status: 'success', message: 'ok' } }));
      },
    };
    TestBed.configureTestingModule({ providers: [{ provide: HttpBackend, useValue: backend }] });

    const response = await new Promise<IBugsReport>(resolve => {
      TestBed.inject(BugsReportService).submitBugsReport(REPORT).subscribe(resolve);
    });

    expect(response.status).toBe('success');
    expect(captured).toHaveLength(1);
    const request = captured[0];
    expect(request.method).toBe('POST');
    expect(request.url).toBe(environment.bugsReportUrl);
    expect(request.headers.get('Content-Type')).toBe('text/plain;charset=utf-8');
    const body = JSON.parse(request.body as string) as IBugsReportDTO & { timestamp: number; token: string; };
    expect(body.errorInfo).toBe(REPORT.errorInfo);
    expect(body.token).toBe(sha256(environment.bugReportSecretKey + body.timestamp));
  });
});
