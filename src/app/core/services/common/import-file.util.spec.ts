import {
  importFileNameError, isXlsxFileName, saveBlobAs, templateFileNameFor, templateRequestParams,
} from './import-file.util';

describe('import-file.util (nhập tệp .csv và .xlsx)', () => {
  it('chấp nhận .csv và .xlsx, không phân biệt hoa thường', () => {
    for (const name of ['a.csv', 'A.CSV', 'diem.xlsx', 'DIEM.XLSX']) {
      expect(importFileNameError(name)).toBeNull();
    }
  });

  it('.xls (Excel cũ) bị từ chối kèm hướng dẫn lưu lại', () => {
    expect(importFileNameError('cu.xls')).toContain('.xls');
    expect(importFileNameError('cu.xls')).toContain('.xlsx');
  });

  it('đuôi khác bị từ chối và không có đuôi cũng bị từ chối', () => {
    expect(importFileNameError('a.pdf')).toContain('.csv hoặc .xlsx');
    expect(importFileNameError('csv')).toContain('.csv hoặc .xlsx');
    expect(importFileNameError('a.csv.exe')).not.toBeNull();
  });

  it('isXlsxFileName chỉ đúng với đuôi .xlsx', () => {
    expect(isXlsxFileName('a.XLSX')).toBe(true);
    expect(isXlsxFileName('a.csv')).toBe(false);
    expect(isXlsxFileName('xlsx')).toBe(false);
  });

  it('tên tệp mẫu: giữ .csv, đổi sang .xlsx khi tải bản Excel', () => {
    expect(templateFileNameFor('users-template.csv', 'csv')).toBe('users-template.csv');
    expect(templateFileNameFor('users-template.csv', 'xlsx')).toBe('users-template.xlsx');
    expect(templateFileNameFor('a.csv.csv', 'xlsx')).toBe('a.csv.xlsx');
  });

  it('tham số tải mẫu: CSV không gửi gì (giữ URL cũ), xlsx gửi format=xlsx', () => {
    expect(templateRequestParams('csv')).toEqual({});
    expect(templateRequestParams('xlsx')).toEqual({ format: 'xlsx' });
  });

  it('saveBlobAs tạo liên kết tải xuống đúng tên rồi dọn dẹp', () => {
    const click = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);
    const created = vi.fn(() => 'blob:mock');
    const revoked = vi.fn();
    URL.createObjectURL = created;
    URL.revokeObjectURL = revoked;

    saveBlobAs(new Blob(['x']), 'mau.xlsx');

    expect(created).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoked).toHaveBeenCalledWith('blob:mock');
    expect(document.querySelector('a[download="mau.xlsx"]')).toBeNull();
  });
});
