import { isXlsxFileName } from './import-file.util';

export interface IImportFilePreview {
  fileName: string;
  fileFormat: 'csv' | 'xlsx';
  headers: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
  warnings: string[];
  missingRequiredColumns: string[];
  unreadable: boolean;
}

export interface IImportPreviewOptions {
  maxPreviewRows?: number;
  requiredColumns?: readonly string[];
}

interface IZipEntry {
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

const DEFAULT_MAX_PREVIEW_ROWS = 10;
const EXCEL_UNREADABLE_WARNING = 'Không thể đọc bảng xem trước của tệp Excel này trên trình duyệt. Bạn vẫn có thể tiếp tục nhập để máy chủ kiểm tra chi tiết.';

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được tệp CSV'));
    reader.readAsText(file, 'UTF-8');
  });
}

function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer().then(buf => new Uint8Array(buf));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được tệp Excel'));
    reader.readAsArrayBuffer(file);
  });
}

/** Phát hiện dấu phân cách phổ biến (`,` hoặc `;`) trên dòng không rỗng đầu tiên ngoài cặp nháy kép. */
function detectCsvDelimiter(text: string): ',' | ';' {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (commas > 0 || semicolons > 0 || i > 0) {
        break;
      }
    } else if (!inQuotes) {
      if (ch === ',') commas++;
      if (ch === ';') semicolons++;
    }
  }
  return semicolons > commas ? ';' : ',';
}

/** Phân tích nội dung CSV (RFC-4180, hỗ trợ BOM UTF-8, dấu `,` hoặc `;`, giá trị có xuống dòng trong ngoặc kép). */
export function parseCsvMatrix(rawText: string): string[][] {
  const clean = rawText.replace(/^\uFEFF/, '');
  if (!clean.trim()) {
    return [];
  }

  const delimiter = detectCsvDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter(r => r.some(v => v.length > 0));
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function parseZipDirectory(bytes: Uint8Array): Map<string, IZipEntry> {
  const entries = new Map<string, IZipEntry>();
  const minEocd = bytes.length - 22;
  if (minEocd < 0) {
    throw new Error('Invalid ZIP buffer');
  }

  let eocdOffset = -1;
  const searchFloor = Math.max(0, bytes.length - 65557);
  for (let i = minEocd; i >= searchFloor; i--) {
    if (readUint32LE(bytes, i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error('ZIP end of central directory not found');
  }

  const totalEntries = readUint16LE(bytes, eocdOffset + 10);
  let cursor = readUint32LE(bytes, eocdOffset + 16);
  const decoder = new TextDecoder('utf-8');

  for (let idx = 0; idx < totalEntries && cursor + 46 <= bytes.length; idx++) {
    if (readUint32LE(bytes, cursor) !== 0x02014b50) {
      break;
    }
    const method = readUint16LE(bytes, cursor + 10);
    const compressedSize = readUint32LE(bytes, cursor + 20);
    const nameLen = readUint16LE(bytes, cursor + 28);
    const extraLen = readUint16LE(bytes, cursor + 30);
    const commentLen = readUint16LE(bytes, cursor + 32);
    const localHeaderOffset = readUint32LE(bytes, cursor + 42);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
    entries.set(name, { method, compressedSize, localHeaderOffset });
    cursor += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

async function extractZipText(bytes: Uint8Array, entries: Map<string, IZipEntry>, path: string): Promise<string | null> {
  const entry = entries.get(path);
  if (!entry) {
    return null;
  }
  const lh = entry.localHeaderOffset;
  if (lh + 30 > bytes.length || readUint32LE(bytes, lh) !== 0x04034b50) {
    throw new Error(`Invalid local header for ${path}`);
  }
  const nameLen = readUint16LE(bytes, lh + 26);
  const extraLen = readUint16LE(bytes, lh + 28);
  const dataStart = lh + 30 + nameLen + extraLen;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > bytes.length) {
    throw new Error(`Truncated ZIP entry for ${path}`);
  }
  const slice = new Uint8Array(bytes.subarray(dataStart, dataEnd));
  const decoder = new TextDecoder('utf-8');

  if (entry.method === 0) {
    return decoder.decode(slice);
  }
  if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream unavailable');
    }
    const stream = new Blob([slice]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const decompressed = await new Response(stream).arrayBuffer();
    return decoder.decode(decompressed);
  }
  throw new Error(`Unsupported ZIP compression method: ${entry.method}`);
}

function parseXmlDocument(xml: string): Document {
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser unavailable');
  }
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Malformed XML in XLSX');
  }
  return doc;
}

function getElementsByLocalName(root: Document | Element, localName: string): Element[] {
  const nsMatches = Array.from(root.getElementsByTagNameNS('*', localName));
  if (nsMatches.length > 0) {
    return nsMatches;
  }
  return Array.from(root.getElementsByTagName(localName));
}

function columnRefToIndex(cellRef: string): number | null {
  const match = /^([A-Z]+)\d+$/i.exec(cellRef.trim());
  if (!match) {
    return null;
  }
  const letters = match[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = (col * 26) + (letters.charCodeAt(i) - 64);
  }
  return col - 1;
}

function normalizeZipTargetPath(target: string): string {
  const cleaned = target.replace(/^\/+/, '');
  return cleaned.startsWith('xl/') ? cleaned : `xl/${cleaned}`;
}

async function resolveFirstWorksheetPath(bytes: Uint8Array, entries: Map<string, IZipEntry>): Promise<string> {
  const fallback = 'xl/worksheets/sheet1.xml';
  const workbookXml = await extractZipText(bytes, entries, 'xl/workbook.xml');
  if (!workbookXml) {
    return fallback;
  }
  const workbookDoc = parseXmlDocument(workbookXml);
  const firstSheet = getElementsByLocalName(workbookDoc, 'sheet')[0];
  if (!firstSheet) {
    return fallback;
  }
  const relId = firstSheet.getAttribute('r:id') ?? firstSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  if (!relId) {
    return fallback;
  }
  const relsXml = await extractZipText(bytes, entries, 'xl/_rels/workbook.xml.rels');
  if (!relsXml) {
    return fallback;
  }
  const relsDoc = parseXmlDocument(relsXml);
  const relEl = getElementsByLocalName(relsDoc, 'Relationship').find(r => r.getAttribute('Id') === relId);
  const target = relEl?.getAttribute('Target');
  return target ? normalizeZipTargetPath(target) : fallback;
}

function extractSharedStrings(xml: string | null): string[] {
  if (!xml) {
    return [];
  }
  const doc = parseXmlDocument(xml);
  return getElementsByLocalName(doc, 'si').map(si => getElementsByLocalName(si, 't').map(t => t.textContent ?? '').join(''));
}

function readCellValue(cell: Element, sharedStrings: readonly string[]): string {
  const cellType = cell.getAttribute('t');
  if (cellType === 'inlineStr') {
    return getElementsByLocalName(cell, 't').map(t => t.textContent ?? '').join('').trim();
  }
  const raw = (getElementsByLocalName(cell, 'v')[0]?.textContent ?? '').trim();
  if (cellType === 's') {
    const idx = Number(raw);
    return Number.isInteger(idx) && idx >= 0 && idx < sharedStrings.length ? sharedStrings[idx].trim() : raw;
  }
  if (cellType === 'b') {
    return raw === '1' ? 'TRUE' : 'FALSE';
  }
  return raw;
}

async function parseXlsxFirstSheetMatrix(file: File): Promise<string[][]> {
  const bytes = await readFileBytes(file);
  const entries = parseZipDirectory(bytes);
  const [sharedStringsXml, sheetPath] = await Promise.all([
    extractZipText(bytes, entries, 'xl/sharedStrings.xml'),
    resolveFirstWorksheetPath(bytes, entries),
  ]);
  const sheetXml = await extractZipText(bytes, entries, sheetPath) ?? await extractZipText(bytes, entries, 'xl/worksheets/sheet1.xml');
  if (!sheetXml) {
    throw new Error('Worksheet XML not found');
  }

  const sharedStrings = extractSharedStrings(sharedStringsXml);
  const sheetDoc = parseXmlDocument(sheetXml);
  const matrix: string[][] = [];

  for (const rowEl of getElementsByLocalName(sheetDoc, 'row')) {
    const rowValues: string[] = [];
    let cursor = 0;

    for (const cellEl of getElementsByLocalName(rowEl, 'c')) {
      const refIdx = columnRefToIndex(cellEl.getAttribute('r') ?? '');
      const colIdx = refIdx ?? cursor;
      while (rowValues.length <= colIdx) {
        rowValues.push('');
      }
      rowValues[colIdx] = readCellValue(cellEl, sharedStrings);
      cursor = colIdx + 1;
    }

    if (rowValues.some(v => v.length > 0)) {
      matrix.push(rowValues);
    }
  }

  return matrix;
}

function buildPreviewFromMatrix(
  fileName: string,
  fileFormat: 'csv' | 'xlsx',
  matrix: string[][],
  options: IImportPreviewOptions,
): IImportFilePreview {
  const maxPreviewRows = options.maxPreviewRows ?? DEFAULT_MAX_PREVIEW_ROWS;
  const requiredColumns = options.requiredColumns ?? [];
  const rawHeaders = (matrix[0] ?? []).map((h, idx) => h || `Cột ${idx + 1}`);
  const dataRows = matrix.slice(1);
  const maxWidth = Math.max(rawHeaders.length, ...dataRows.map(r => r.length), 0);

  const headers = [...rawHeaders];
  for (let i = headers.length; i < maxWidth; i++) {
    headers.push(`Cột ${i + 1}`);
  }

  const normalizedRows = dataRows
    .slice(0, maxPreviewRows)
    .map(r => headers.map((_, idx) => r[idx] ?? ''));

  const normalizedHeaderSet = new Set(headers.map(h => h.trim().toLowerCase()));
  const missingRequiredColumns = headers.length > 0
    ? requiredColumns.filter(req => !normalizedHeaderSet.has(req.trim().toLowerCase()))
    : [];

  const warnings: string[] = [];
  if (headers.length === 0) {
    warnings.push('Không tìm thấy dòng tiêu đề hợp lệ trong tệp.');
  } else if (dataRows.length === 0) {
    warnings.push('Tệp chỉ có dòng tiêu đề, chưa có dòng dữ liệu nào để nhập.');
  }

  return {
    fileName,
    fileFormat,
    headers,
    rows: normalizedRows,
    totalRows: dataRows.length,
    truncated: dataRows.length > normalizedRows.length,
    warnings,
    missingRequiredColumns,
    unreadable: false,
  };
}

/**
 * Phân tích tệp `.csv` hoặc `.xlsx` phía trình duyệt để hiển thị bảng xem trước trước khi gửi lên máy chủ.
 * Nếu tệp `.xlsx` không giải nén/đọc được trong môi trường trình duyệt, trả về kết quả đánh dấu `unreadable`
 * thay vì ném lỗi để không chặn luồng gửi lên backend.
 */
export async function parseImportFilePreview(
  file: File,
  options: IImportPreviewOptions = {},
): Promise<IImportFilePreview> {
  const fileFormat: 'csv' | 'xlsx' = isXlsxFileName(file.name) ? 'xlsx' : 'csv';

  if (fileFormat === 'csv') {
    const text = await readFileText(file);
    return buildPreviewFromMatrix(file.name, 'csv', parseCsvMatrix(text), options);
  }

  try {
    const matrix = await parseXlsxFirstSheetMatrix(file);
    return buildPreviewFromMatrix(file.name, 'xlsx', matrix, options);
  } catch {
    return {
      fileName: file.name,
      fileFormat: 'xlsx',
      headers: [],
      rows: [],
      totalRows: 0,
      truncated: false,
      warnings: [EXCEL_UNREADABLE_WARNING],
      missingRequiredColumns: [],
      unreadable: true,
    };
  }
}
