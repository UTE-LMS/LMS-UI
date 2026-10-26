import { HttpClient, HttpEvent, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UrlConstant } from '@constants/url.constant';
import { IFileInfo, IListFilesPatchFileInfo, IListFilesPatchId } from '@models/common/file.model';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, throttleTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private http = inject(HttpClient);


  private apiUrl = UrlConstant.API.FILE;

  uploadFile(file: File, subFolder: string): Observable<HttpEvent<IFileInfo>> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const params = new HttpParams()
      .set('name', file.name)
      .set('subFolder', subFolder);

    return this.http
      .post<IFileInfo>(this.apiUrl, fd, { params, observe: 'events', reportProgress: true })
      .pipe(throttleTime(500, undefined, { leading: false, trailing: true }));
  }

  uploadMultiFile(files: FileList, subFolder: string): Observable<HttpEvent<IFileInfo>[] | null> {
    if (files.length) {
      const buildUploadingQueue: Observable<HttpEvent<IFileInfo>>[] = [];
      Array.from(files).forEach(file => {
        const fd = new FormData();
        fd.append('file', file, file.name);
        const params = new HttpParams()
          .set('name', file.name)
          .set('subFolder', subFolder);
        buildUploadingQueue.push(
          this.http
            .post<IFileInfo>(this.apiUrl, fd, { params, observe: 'events', reportProgress: true }),
        );
      });
      return combineLatest(buildUploadingQueue)
        .pipe(
          throttleTime(500, undefined, { leading: true, trailing: true }),
          catchError(() => of(null)),
        );
    } else {
      return of(null);
    }
  }

  getFileInfo(idFile: string): Observable<IFileInfo> {
    return this.http
      .get<IFileInfo>(this.apiUrl + `/${idFile}`);
  }

  viewFile(idFile: string): Observable<HttpResponse<Blob>> {
    return this.http
      .get(this.apiUrl + `/view/${idFile}`, { observe: 'response', responseType: 'blob' });
  }

  downloadFile(idFile: string): Observable<HttpResponse<Blob>> {
    return this.http
      .get(this.apiUrl + `/download/${idFile}`, { observe: 'response', responseType: 'blob' });
  }

  // Utils core ///////////////////////////////////////////////////////////////////
  // Use in HTML: [listFilesPatch]="extractFileFromListId([form.get('fileABC')?.value ?? ''].flat())"
  extractFileFromListId(listFileId: string[]): IListFilesPatchId[] {
    if (listFileId.length) {
      return listFileId.filter(x => x !== '' && x !== null)
        .map(idFile => ({ id: idFile }));
    } else {
      return [];
    }
  }

  setListIdFileToForm(listFiles: IListFilesPatchId[], formControlName: string, form: FormGroup): void {
    form.get(formControlName)?.setValue(listFiles.length ? listFiles.map(x => x.id) : null);
  }

  setIdFileToForm(listFiles: IListFilesPatchId[], formControlName: string, form: FormGroup): void {
    form.get(formControlName)?.setValue(listFiles.length ? listFiles[0].id : null);
  }

  ////////     ////////////     //////////////

  // Use in HTML: [listFilesPatch]="extractFileFromListId([form.get('fileABC')?.value ?? undefined].flat())"
  extractFileFromListFileInfo(listFileId: (IFileInfo | undefined)[]): IListFilesPatchFileInfo[] {
    const list = listFileId.filter(x => x?.fileName);
    if (list?.length) {
      return list.map(x => ({ id: x?.id ?? `${Math.random()}`, fileInfo: x }));
    } else {
      return [];
    }
  }

  setListFileInfoToForm(listFiles: IListFilesPatchFileInfo[], formControlName: string, form: FormGroup): void {
    form.get(formControlName)?.setValue(listFiles.length ? listFiles.map(x => x.fileInfo) : null);
  }

  setFileInfoToForm(listFiles: IListFilesPatchFileInfo[], formControlName: string, form: FormGroup): void {
    form.get(formControlName)?.setValue(listFiles.length ? listFiles[0].fileInfo : null);
  }

  // Utils

  b64toBlob(
    b64DataRaw: string,
    contentTypeInput?: string,
    sliceSizeInput?: number,
  ): Blob { // contentTypeInput=image/png ; sliceSize=512 data:image/png;base64,
    const contentType = contentTypeInput ?? 'image/jpeg';
    const sliceSize = sliceSizeInput ?? 512;
    const byteCharacters = window.atob(b64DataRaw.replace(/^data:.+;base64,/, ''));
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }

  blobToFile(theBlob: Blob, fileName: string): File {
    return new File([theBlob], fileName, {
      type: theBlob.type,
      lastModified: Date.now(),
    });
  }

  blobToDownloadFile(data: Blob, fileName: string) {
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.setAttribute('style', 'display: none');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }

  blobToB64(blob: Blob, prefix?: string): Promise<string> { // 'data:image/jpeg;base64,'
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const tmpBase64 = reader.result as string;
        resolve((prefix ?? '') + tmpBase64.substring(tmpBase64.indexOf(',') + 1));
      };
      reader.readAsDataURL(blob);
    });
  }

  getListFileToListB64(listIdFile: string[], prefix?: string): Promise<Record<string, string>[]> {
    // How to use: You will got list of object [{...},...],
    // then you need merge it all: Object.assign({}, ...<result of this Fn>)
    // Use in HTML template: [attr.src]="storedVar[idFile]"
    return Promise.all<Record<string, string>>(
      listIdFile.map(idFile => new Promise((resolve) => {
        this.downloadFile(idFile).subscribe({
          next: res => {
            this.blobToB64(res.body ?? new Blob(), prefix)
              .then(b64 => resolve({ [idFile]: b64 }));
          },
        });
      })),
    );
  }

  // Hey, remember you had a directive for loading image from template
  // at @widget/directives/get-image-view.directive.ts
}
