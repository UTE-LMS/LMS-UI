import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CheckFileTypeService {
  // https://en.wikipedia.org/wiki/List_of_file_signatures
  // copy('HEX STRING WITH SPACE'.split(' ').reduce((s, o) => s += ', ' + parseInt(o, 16), '').slice(2))
  private fileSignatutes: FileSignature[] = [
    {
      type: 'image',
      filetype: 'jpg',
      signgatureUint8Array: [255, 216, 255, 219],
    },
    {
      type: 'image',
      filetype: 'jpg',
      signgatureUint8Array: [255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1],
    },
    {
      type: 'image',
      filetype: 'jpg',
      signgatureUint8Array: [255, 216, 255, 238],
    },
    {
      type: 'image',
      filetype: 'jpg',
      signgatureUint8Array: [255, 216, 255, 225, -1, -1, 69, 120, 105, 102, 0, 0],
    },
    {
      type: 'image',
      filetype: 'png',
      signgatureUint8Array: [137, 80, 78, 71, 13, 10, 26, 10],
    },
    {
      type: 'pdf',
      filetype: 'pdf',
      signgatureUint8Array: [37, 80, 68, 70, 45],
    },
    {
      type: 'office',
      filetype: 'docx',
      signgatureUint8Array: [80, 75, 3, 4],
    },
    {
      type: 'office',
      filetype: 'doc',
      signgatureUint8Array: [208, 207, 17, 224, 161, 177, 26, 225],
    },
    {
      type: 'office',
      filetype: 'zip',
      signgatureUint8Array: [80, 75, 5, 6],
    },
    {
      type: 'archive',
      filetype: 'rar',
      signgatureUint8Array: [82, 97, 114, 33, 26, 7, 0],
    },
    {
      type: 'archive',
      filetype: 'rar',
      signgatureUint8Array: [82, 97, 114, 33, 26, 7, 1, 0],
    },
    {
      type: 'video',
      filetype: 'mp4',
      signgatureUint8Array: [102, 116, 121, 112, 105, 115, 111, 109],
    },
  ];

  checkTypeOfBlob(
    arrBufferData: ArrayBuffer,
    checkType?: 'image' | 'pdf' | 'archive' | 'office' | 'video' | null,
  ): Observable<string> {
    const uInt8Arr = Array.from(new Uint8Array(arrBufferData));
    if (checkType) {
      return of(this.fileSignatutes
        .reduce((typeRes, typeCheck) => (
          this.compareTwoIntArray(typeCheck.signgatureUint8Array, uInt8Arr) ? typeCheck.filetype : typeRes
        ), ''));
    } else {
      return of(this.fileSignatutes
        .reduce((typeRes, typeCheck) => (
          this.compareTwoIntArray(typeCheck.signgatureUint8Array, uInt8Arr) ? typeCheck.filetype : typeRes
        ), ''));
    }
  }

  // sourceArr = Signature Array ; compareArr = file Uint8Array
  private compareTwoIntArray(sourceArr: number[], compareArr: number[]): boolean {
    if (sourceArr.length > compareArr.length) {
      throw new Error('Source Array length must be less than or equal Compare Array length');
    } else {
      return sourceArr.reduce((result, num, i) => result && (num === -1 ? true : compareArr[i] === num), true);
    }
  }
}

export interface FileSignature {
  type: 'image' | 'pdf' | 'archive' | 'office' | 'video';
  filetype: string;
  signgatureUint8Array: number[];
}
