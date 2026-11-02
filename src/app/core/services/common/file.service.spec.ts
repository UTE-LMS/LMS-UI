import { HttpEvent, HttpEventType, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { IFileInfo } from '@models/common/file.model';
import { of } from 'rxjs';
import { FileService } from './file.service';

const FILE_API = 'rest/file';

/** DỮ LIỆU THỬ NGHIỆM: thông tin tệp giả. */
const FILE_INFO: IFileInfo = {
  id: 'f1', fileType: 'pdf', fileName: 'thu-nghiem.pdf', fileNameEn: 'test.pdf', fileSize: 12, location: 'x',
};

/** jsdom chưa cài Blob.text(), nên đọc bằng FileReader. */
function readText(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { service: TestBed.inject(FileService), http: TestBed.inject(HttpTestingController) };
}

describe('NT-UI/AC-7: FileService — gọi API tệp', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.inject(HttpTestingController).verify();
  });

  it('getFileInfo gọi GET rest/file/{id}', () => {
    const { service, http } = setup();
    let received: IFileInfo | undefined;
    service.getFileInfo('f1').subscribe(info => { received = info; });
    const req = http.expectOne(`${FILE_API}/f1`);
    expect(req.request.method).toBe('GET');
    req.flush(FILE_INFO);
    expect(received).toEqual(FILE_INFO);
  });

  it('viewFile và downloadFile yêu cầu phản hồi dạng blob', () => {
    const { service, http } = setup();
    service.viewFile('f1').subscribe();
    service.downloadFile('f2').subscribe();
    const view = http.expectOne(`${FILE_API}/view/f1`);
    const download = http.expectOne(`${FILE_API}/download/f2`);
    expect(view.request.responseType).toBe('blob');
    expect(download.request.responseType).toBe('blob');
    view.flush(new Blob(['a']));
    download.flush(new Blob(['b']));
  });

  it('uploadFile gửi multipart có tham số name/subFolder và phát sự kiện sau khi tiết lưu', () => {
    vi.useFakeTimers();
    const { service, http } = setup();
    const events: HttpEvent<IFileInfo>[] = [];
    const file = new File(['noi dung thu nghiem'], 'bang-diem.csv', { type: 'text/csv' });
    service.uploadFile(file, 'diem').subscribe(event => events.push(event));

    const req = http.expectOne(r => r.url === FILE_API);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('name')).toBe('bang-diem.csv');
    expect(req.request.params.get('subFolder')).toBe('diem');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBeInstanceOf(File);
    req.flush(FILE_INFO);

    expect(events).toHaveLength(0);
    vi.advanceTimersByTime(500);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(HttpEventType.Response);
  });

  it('uploadMultiFile với danh sách rỗng trả về null và không gọi mạng (ca biên)', async () => {
    const { service, http } = setup();
    const result = await new Promise(resolve => {
      service.uploadMultiFile([] as unknown as FileList, 'x').subscribe(resolve);
    });
    expect(result).toBeNull();
    http.expectNone(FILE_API);
  });

  it('uploadMultiFile gửi mỗi tệp một yêu cầu POST', () => {
    const { service, http } = setup();
    const files = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')] as unknown as FileList;
    service.uploadMultiFile(files, 'sub').subscribe();
    const requests = http.match(r => r.url === FILE_API);
    expect(requests).toHaveLength(2);
    expect(requests.map(r => r.request.params.get('name'))).toEqual(['a.txt', 'b.txt']);
    requests.forEach(r => r.flush(FILE_INFO));
  });
});

describe('NT-UI/AC-7: FileService — chuyển đổi dữ liệu tệp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extractFileFromListId bỏ id rỗng/null, danh sách rỗng trả về rỗng', () => {
    const { service } = setup();
    expect(service.extractFileFromListId(['a', '', 'b'])).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(service.extractFileFromListId([])).toEqual([]);
    expect(service.extractFileFromListId([null as unknown as string])).toEqual([]);
  });

  it('extractFileFromListFileInfo chỉ giữ tệp có tên và dùng id của tệp', () => {
    const { service } = setup();
    const result = service.extractFileFromListFileInfo([FILE_INFO, undefined, { ...FILE_INFO, fileName: '' }]);
    expect(result).toEqual([{ id: 'f1', fileInfo: FILE_INFO }]);
    expect(service.extractFileFromListFileInfo([])).toEqual([]);
  });

  it('extractFileFromListFileInfo tự sinh id tạm khi tệp chưa có id', () => {
    const { service } = setup();
    const result = service.extractFileFromListFileInfo([{ ...FILE_INFO, id: undefined } as unknown as IFileInfo]);
    expect(result).toHaveLength(1);
    expect(result[0].id).not.toBe('');
  });

  it('set*ToForm ghi giá trị vào control; danh sách rỗng ghi null', () => {
    const { service } = setup();
    const form = new FormGroup({ files: new FormControl<unknown>(undefined) });
    service.setListIdFileToForm([{ id: 'a' }, { id: 'b' }], 'files', form);
    expect(form.get('files')?.value).toEqual(['a', 'b']);
    service.setListIdFileToForm([], 'files', form);
    expect(form.get('files')?.value).toBeNull();
    service.setIdFileToForm([{ id: 'a' }, { id: 'b' }], 'files', form);
    expect(form.get('files')?.value).toBe('a');
    service.setIdFileToForm([], 'files', form);
    expect(form.get('files')?.value).toBeNull();
    service.setListFileInfoToForm([{ id: 'f1', fileInfo: FILE_INFO }], 'files', form);
    expect(form.get('files')?.value).toEqual([FILE_INFO]);
    service.setFileInfoToForm([{ id: 'f1', fileInfo: FILE_INFO }], 'files', form);
    expect(form.get('files')?.value).toEqual(FILE_INFO);
    service.setFileInfoToForm([], 'files', form);
    expect(form.get('files')?.value).toBeNull();
    service.setListFileInfoToForm([], 'files', form);
    expect(form.get('files')?.value).toBeNull();
  });

  it('set*ToForm với control không tồn tại không ném lỗi (ca âm)', () => {
    const { service } = setup();
    const form = new FormGroup({});
    expect(() => service.setIdFileToForm([{ id: 'a' }], 'khong-co', form)).not.toThrow();
  });

  it('b64toBlob giải mã base64 (có hoặc không có tiền tố data URL) thành đúng byte và kiểu', async () => {
    const { service } = setup();
    // "Xin chao" -> base64 "WGluIGNoYW8="
    const blob = service.b64toBlob('data:text/plain;base64,WGluIGNoYW8=', 'text/plain', 4);
    expect(blob.type).toBe('text/plain');
    expect(blob.size).toBe(8);
    expect(await readText(blob)).toBe('Xin chao');
    expect(service.b64toBlob('WGluIGNoYW8=').type).toBe('image/jpeg');
  });

  it('b64toBlob với chuỗi base64 sai định dạng ném lỗi (ca âm)', () => {
    const { service } = setup();
    expect(() => service.b64toBlob('***không-phải-base64***')).toThrow();
  });

  it('blobToFile giữ kiểu MIME và đặt tên tệp', () => {
    const { service } = setup();
    const file = service.blobToFile(new Blob(['x'], { type: 'text/plain' }), 'a.txt');
    expect(file.name).toBe('a.txt');
    expect(file.type).toBe('text/plain');
  });

  it('blobToB64 trả về phần base64 (bỏ tiền tố của FileReader) và nối tiền tố do người gọi chọn', async () => {
    const { service } = setup();
    const blob = new Blob(['Xin chao'], { type: 'text/plain' });
    expect(await service.blobToB64(blob)).toBe('WGluIGNoYW8=');
    expect(await service.blobToB64(blob, 'data:text/plain;base64,')).toBe('data:text/plain;base64,WGluIGNoYW8=');
  });

  it('blobToDownloadFile tạo liên kết tải xuống, bấm rồi dọn dẹp', () => {
    const { service } = setup();
    const createUrl = vi.fn(() => 'blob:gia');
    const revokeUrl = vi.fn();
    Object.assign(window.URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    service.blobToDownloadFile(new Blob(['x']), 'ket-qua.csv');

    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith('blob:gia');
    expect(document.querySelector('a[download="ket-qua.csv"]')).toBeNull();
  });

  it('getListFileToListB64 tải từng tệp rồi trả về bản đồ id -> base64', async () => {
    const { service } = setup();
    vi.spyOn(service, 'downloadFile').mockReturnValue(of(new HttpResponse({ body: new Blob(['Xin chao']) })));
    const result = await service.getListFileToListB64(['f1']);
    expect(result).toEqual([{ f1: 'WGluIGNoYW8=' }]);
  });
});
