import { Injectable } from '@angular/core';
import langDataEn from '@languages/en.json';
import langDataVi from '@languages/vi.json';

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  // Ngon ngu hien thi //////////
  private langCode: 'en' | 'vi' = localStorage.getItem('language') as 'en' | 'vi' ?? 'vi';
  private langData: Record<string, string> = (this.langCode === 'vi' ? langDataVi : langDataEn)
    .CORE.UTILS;
  //////////////////////////////

  transformUtf8ToAscii(inp: string): string {
    return this.removeVietnameseUnicode(inp)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]+/g, '')
      .replace(/\s/g, '-')
      .replace(/-{1,}/g, '-');
  }

  removeVietnameseUnicode(str: string): string {
    if (!str) {
      return '';
    } else {
      str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
      str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
      str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
      str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
      str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
      str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
      str = str.replace(/đ/g, 'd');
      str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
      str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
      str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
      str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
      str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
      str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
      str = str.replace(/Đ/g, 'D');
      return str;
    }
  }

  daysAmountToText(dayCount: number): string {
    const isHetHan = dayCount >= 0;
    const dayCountAbs = Math.abs(dayCount);

    if (dayCountAbs > 365) {
      return Math.floor(dayCountAbs / 365) + ' ' + (isHetHan ? this.langData.NAM_TRUOC : this.langData.NAM);
    } else if (dayCountAbs > 30) {
      return Math.floor(dayCountAbs / 30) + ' ' + (isHetHan ? this.langData.THANG_TRUOC : this.langData.THANG);
    } else {
      return dayCountAbs + ' ' + (isHetHan ? this.langData.NGAY_TRUOC : this.langData.NGAY);
    }
  }

  readNumberAsText(num: number, endingStr?: string) {
    const tienText = [
      '', ` ${this.langData.NGHIN} `, ` ${this.langData.TRIEU} `, ` ${this.langData.TY} `,
      ` ${this.langData.NGHIN} ${this.langData.TY} `,
      ` ${this.langData.TRIEU} ${this.langData.TY} `,
      ` ${this.langData.TY} ${this.langData.TY} `,
    ];
    const strNum = num.toString().split(/(?=(?:...)*$)/);
    const len = strNum.length;
    let output = ` ${endingStr ?? ''}`;

    if (isNaN(num)) {
      return '';
    } else if (num === 0) {
      return `${this.langData.KHONG_LCAP} ${endingStr ?? ''}`;
    } else {
      for (let i = 0; i < len; i++) {
        if (parseInt(strNum[len - 1 - i], 10) === 0) {
          continue;
        }
        output = tienText[i] + output;
        output = this.readNumber3Num(strNum[len - 1 - i]) + output;
      }
      const doneOutput = (output.replace('  ', ' ').charAt(0).toUpperCase() + output.replace('  ', ' ').slice(1)).trim();
      return this.langCode === 'vi' ? doneOutput : doneOutput
        .replace(/\sty/g, 'ty')
        .replace(/hundred\s/g, 'hundred and ')
        .replace(/[zZ]ero hundred/g, '')
        .replace(/woty/g, 'wenty')
        .replace(/hreety/g, 'hirty')
        .replace(/if\s/g, 'ive ')
        .replace(/eightty/g, 'eighty')
        .replace('  ', ' ');
    }
  }

  private readNumber3Num(num: string) {
    if (num.length === 1) {
      return this.getTextOfDonVi(parseInt(num, 10), '0');
    } else if (num.length === 2) {
      return this.getTextOfChuc(parseInt(num[0], 10), num[1]) + ' '
        + this.getTextOfDonVi(parseInt(num[1], 10), num[0]);
    } else if (num.length === 3) {
      return this.getTextOfTram(parseInt(num[0], 10)) + ' ' +
        this.getTextOfChuc(parseInt(num[1], 10), num[2]) + ' ' +
        this.getTextOfDonVi(parseInt(num[2], 10), num[1]);
    } else {
      return '';
    }
  }

  private getTextOfDonVi(num: number, hangChuc: string) {
    switch (num) {
      case 0:
        return '';
      case 1:
        return hangChuc === '0' || hangChuc === '1' ? this.langData.MOT_J : this.langData.MOT_S;
      case 2:
        return this.langData.HAI;
      case 3:
        return this.langData.BA;
      case 4:
        return this.langData.BON;
      case 5:
        return hangChuc === '0' ? this.langData.NAM_N : this.langData.NAM_L;
      case 6:
        return this.langData.SAU;
      case 7:
        return this.langData.BAY;
      case 8:
        return this.langData.TAM;
      case 9:
        return this.langData.CHIN;
      default:
        return '';
    }
  }

  private getTextOfChuc(num: number, hangDonVi: string) {
    switch (num) {
      case 0:
        return hangDonVi === '0' ? '' : this.langData.LE;
      case 1:
        return this.langData.MUOI_F;
      case 2:
        return `${this.langData.HAI} ${this.langData.MUOI}`;
      case 3:
        return `${this.langData.BA} ${this.langData.MUOI}`;
      case 4:
        return `${this.langData.BON} ${this.langData.MUOI}`;
      case 5:
        return `${this.langData.NAM_N} ${this.langData.MUOI}`;
      case 6:
        return `${this.langData.SAU} ${this.langData.MUOI}`;
      case 7:
        return `${this.langData.BAY} ${this.langData.MUOI}`;
      case 8:
        return `${this.langData.TAM} ${this.langData.MUOI}`;
      case 9:
        return `${this.langData.CHIN} ${this.langData.MUOI}`;
      default:
        return '';
    }
  }

  private getTextOfTram(num: number) {
    switch (num) {
      case 0:
        return `${this.langData.KHONG} ${this.langData.TRAM}`;
      case 1:
        return `${this.langData.MOT_J} ${this.langData.TRAM}`;
      case 2:
        return `${this.langData.HAI} ${this.langData.TRAM}`;
      case 3:
        return `${this.langData.BA} ${this.langData.TRAM}`;
      case 4:
        return `${this.langData.BON} ${this.langData.TRAM}`;
      case 5:
        return `${this.langData.NAM_N} ${this.langData.TRAM}`;
      case 6:
        return `${this.langData.SAU} ${this.langData.TRAM}`;
      case 7:
        return `${this.langData.BAY} ${this.langData.TRAM}`;
      case 8:
        return `${this.langData.TAM} ${this.langData.TRAM}`;
      case 9:
        return `${this.langData.CHIN} ${this.langData.TRAM}`;
      default:
        return '';
    }
  }
}
