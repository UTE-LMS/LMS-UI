import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CheckFileTypeService } from './check-file-type.service';

/** Tạo bộ đệm ≥ 12 byte: chữ ký ở đầu, phần còn lại là 0. */
function bufferWithSignature(signature: number[], totalLength = 16): ArrayBuffer {
  const bytes = new Uint8Array(totalLength);
  bytes.set(signature);
  return bytes.buffer;
}

async function detect(buffer: ArrayBuffer): Promise<string> {
  const service = TestBed.inject(CheckFileTypeService);
  return firstValueFrom(service.checkTypeOfBlob(buffer));
}

describe('NT-UI/AC-6: CheckFileTypeService (nhận diện loại tệp theo chữ ký byte, không tin phần mở rộng)', () => {
  it.each([
    ['PNG', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'png'],
    ['PDF', [0x25, 0x50, 0x44, 0x46, 0x2d], 'pdf'],
    ['JPEG', [0xff, 0xd8, 0xff, 0xdb], 'jpg'],
    ['DOCX/ZIP (PK 03 04)', [0x50, 0x4b, 0x03, 0x04], 'docx'],
    ['DOC (OLE2)', [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 'doc'],
    ['RAR 4', [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00], 'rar'],
    ['RAR 5', [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00], 'rar'],
  ])('nhận ra %s', async (_name, signature, expected) => {
    expect(await detect(bufferWithSignature(signature))).toBe(expected);
  });

  it('JPEG Exif dùng ký tự đại diện (-1) cho 2 byte độ dài', async () => {
    const exif = [0xff, 0xd8, 0xff, 0xe1, 0x12, 0x34, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
    expect(await detect(bufferWithSignature(exif))).toBe('jpg');
  });

  it('nội dung không khớp chữ ký nào trả về chuỗi rỗng (ca âm)', async () => {
    expect(await detect(bufferWithSignature([1, 2, 3, 4]))).toBe('');
  });

  it('tệp văn bản giả đuôi .png (nội dung "hello world!") không bị nhận là png', async () => {
    const bytes = new TextEncoder().encode('hello world!!!!');
    expect(await detect(bytes.buffer)).toBe('');
  });

  it('tham số checkType không làm thay đổi kết quả nhận diện hiện tại', async () => {
    const service = TestBed.inject(CheckFileTypeService);
    const pdf = bufferWithSignature([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(await firstValueFrom(service.checkTypeOfBlob(pdf, 'pdf'))).toBe('pdf');
    expect(await firstValueFrom(service.checkTypeOfBlob(pdf, 'image'))).toBe('pdf');
  });

  it('đặc tính hiện tại: bộ đệm ngắn hơn chữ ký dài nhất (12 byte) ném lỗi thay vì trả về rỗng', () => {
    const service = TestBed.inject(CheckFileTypeService);
    const tooShort = bufferWithSignature([0x89, 0x50, 0x4e, 0x47], 8);
    expect(() => service.checkTypeOfBlob(tooShort)).toThrow(/Source Array length/);
  });
});
