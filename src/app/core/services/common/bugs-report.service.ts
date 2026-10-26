import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env';
import { IBugsReport, IBugsReportDTO } from '@models/common/bugs-report.model';
import { sha256 } from 'js-sha256';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BugsReportService {
  private httpBackend = inject(HttpBackend);
  private http = new HttpClient(this.httpBackend);
  private apiUrl = environment.bugsReportUrl;
  private secretKey = environment.bugReportSecretKey;

  submitBugsReport(bugData: IBugsReportDTO): Observable<IBugsReport> {
    const timestamp = new Date().getTime();
    const token = sha256(this.secretKey + timestamp);
    const body = JSON.stringify({
      ...bugData,
      timestamp,
      token,
    });
    return this.http.post<IBugsReport>(this.apiUrl, body, { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  }
}
