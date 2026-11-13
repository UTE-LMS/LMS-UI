import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UrlConstant } from '@constants/url.constant';
import {
  IImportBatch,
  IImportColumnMapping,
  IImportRowError,
  ImportSourceSystem,
  ReimportPolicy,
} from '@models/assessment/score-import.model';
import { IPagedResults } from '@models/common/response-data.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScoreImportService {
  private readonly http = inject(HttpClient);

  createBatch(
    sectionId: string,
    assessmentId: string,
    file: File,
    columnMapping?: IImportColumnMapping,
    reimportPolicy?: ReimportPolicy,
    sourceSystem?: ImportSourceSystem,
  ): Observable<IImportBatch> {
    const formData = new FormData();
    formData.append('file', file);
    if (columnMapping) {
      formData.append('columnMapping', JSON.stringify(columnMapping));
    }
    if (reimportPolicy) {
      formData.append('reimportPolicy', reimportPolicy);
    }
    if (sourceSystem) {
      formData.append('sourceSystem', sourceSystem);
    }

    return this.http.post<IImportBatch>(
      UrlConstant.API.IMPORT_BATCH_CREATE(sectionId, assessmentId),
      formData,
    );
  }

  listBatches(sectionId: string, assessmentId: string): Observable<IImportBatch[]> {
    return this.http.get<IImportBatch[]>(
      UrlConstant.API.IMPORT_BATCH_LIST(sectionId, assessmentId),
    );
  }

  getBatch(id: string): Observable<IImportBatch> {
    return this.http.get<IImportBatch>(UrlConstant.API.IMPORT_BATCH_DETAIL(id));
  }

  getErrors(id: string, page = 0, size = 50): Observable<IPagedResults<IImportRowError>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<IPagedResults<IImportRowError>>(
      UrlConstant.API.IMPORT_BATCH_ERRORS(id),
      { params },
    );
  }

  validateBatch(id: string): Observable<IImportBatch> {
    return this.http.post<IImportBatch>(UrlConstant.API.IMPORT_BATCH_VALIDATE(id), {});
  }

  confirmBatch(id: string): Observable<IImportBatch> {
    return this.http.post<IImportBatch>(UrlConstant.API.IMPORT_BATCH_CONFIRM(id), {});
  }

  rollbackBatch(id: string): Observable<IImportBatch> {
    return this.http.post<IImportBatch>(UrlConstant.API.IMPORT_BATCH_ROLLBACK(id), {});
  }
}
