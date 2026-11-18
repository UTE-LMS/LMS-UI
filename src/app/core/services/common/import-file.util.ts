/**
 * Tiện ích dùng chung cho các màn nhập tệp: chấp nhận `.csv` và `.xlsx` (ADR 0015 ở repo API).
 * Backend là nơi kiểm tra chính thức; các hàm này chỉ giúp báo lỗi sớm và tải tệp mẫu.
 */

export type ImportTemplateFormat = 'csv' | 'xlsx';

/** Giá trị cho thuộc tính `accept` của ô chọn tệp. */
export const IMPORT_FILE_ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Câu mô tả định dạng cho phần hướng dẫn trên giao diện. */
export const IMPORT_FILE_FORMAT_HINT = '.csv (UTF-8) hoặc .xlsx';

export const isXlsxFileName = (fileName: string): boolean => fileName.toLowerCase().endsWith('.xlsx');

/** Thông báo lỗi nếu tên tệp không được nhận; `null` khi hợp lệ. */
export function importFileNameError(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.xlsx')) {
    return null;
  }
  if (lower.endsWith('.xls')) {
    return 'Chưa hỗ trợ tệp .xls (Excel cũ). Hãy mở bằng Excel và lưu thành .xlsx hoặc .csv.';
  }
  return 'Định dạng tệp không hợp lệ! Vui lòng chọn tệp .csv hoặc .xlsx.';
}

/** Tên tệp mẫu theo định dạng: đổi đuôi `.csv` thành `.xlsx` khi tải bản Excel. */
export function templateFileNameFor(csvFileName: string, format: ImportTemplateFormat): string {
  return format === 'xlsx' ? csvFileName.replace(/\.csv$/i, '.xlsx') : csvFileName;
}

/** Tham số truy vấn tải tệp mẫu: bản CSV (mặc định) không gửi tham số để giữ nguyên URL cũ. */
export function templateRequestParams(format: ImportTemplateFormat): Record<string, string> {
  return format === 'xlsx' ? { format } : {};
}

/** Lưu `blob` xuống máy người dùng với tên `fileName`. */
export function saveBlobAs(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
