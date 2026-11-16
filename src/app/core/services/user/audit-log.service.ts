import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { IAuditLog, IAuditLogFilter } from '@models/common/audit-log.model';
import { IPagedResults } from '@models/common/response-data.model';
import { Observable } from 'rxjs';

/** F01 - Nhật ký thao tác, chỉ đọc. Backend chỉ cho ADMIN; trang 0-based, size 1..100. */
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = UrlConstant.API.AUDIT_LOGS;

  filter(filter: Partial<IAuditLogFilter>, page: number, size: number): Observable<IPagedResults<IAuditLog>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    for (const [key, value] of Object.entries(filter) as [string, string | undefined][]) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<IPagedResults<IAuditLog>>(this.apiUrl, { params });
  }
}
