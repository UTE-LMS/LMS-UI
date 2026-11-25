import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import { IAnalyticsMatrix, IAnalyticsQuery } from '@models/measurement/analytics.model';
import { Observable } from 'rxjs';

/** F07 - Phân tích đa chiều: ma trận chỉ số theo một chiều và xuất CSV cùng tham số. */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  getMatrix(query: IAnalyticsQuery): Observable<IAnalyticsMatrix> {
    return this.http.get<IAnalyticsMatrix>(UrlConstant.API.ANALYTICS, { params: this.toParams(query) });
  }

  exportCsv(query: IAnalyticsQuery): Observable<HttpResponse<Blob>> {
    const exportQuery: IAnalyticsQuery = { ...query };
    delete exportQuery.page;
    delete exportQuery.size;
    return this.http.get(UrlConstant.API.ANALYTICS_EXPORT, {
      params: this.toParams(exportQuery),
      observe: 'response',
      responseType: 'blob',
    });
  }

  /** Bỏ trường rỗng; mảng gửi bằng cách lặp lại khóa để Spring gắn vào List<String>. */
  private toParams(query: IAnalyticsQuery): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query) as [string, string | number | boolean | string[] | undefined][]) {
      if (Array.isArray(value)) {
        for (const item of value) {
          params = params.append(key, String(item));
        }
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          params = params.set(key, trimmed);
        }
      } else if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
