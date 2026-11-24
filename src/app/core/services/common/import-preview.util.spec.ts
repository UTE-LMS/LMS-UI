import { parseCsvMatrix, parseImportFilePreview } from './import-preview.util';

/** Tạo tệp ZIP không nén (method=0) hợp lệ tối thiểu trong bộ nhớ để kiểm thử trình đọc `.xlsx`. */
function buildStoredZip(entries: { name: string; content: string; }[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lhView = new DataView(localHeader.buffer);
    lhView.setUint32(0, 0x04034b50, true);
    lhView.setUint16(4, 20, true);
    lhView.setUint16(8, 0, true);
    lhView.setUint32(18, dataBytes.length, true);
    lhView.setUint32(22, dataBytes.length, true);
    lhView.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(centralHeader.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint16(10, 0, true);
    cdView.setUint32(20, dataBytes.length, true);
    cdView.setUint32(24, dataBytes.length, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);

  const totalSize = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of [...localParts, ...centralParts, eocd]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

describe('import-preview.util', () => {
  it('parseCsvMatrix đọc đúng BOM UTF-8, dấu chấm phẩy và giá trị có dấu phẩy trong ngoặc kép', () => {
    const csv = '\uFEFFcode;name;description\r\n"FIT";"Khoa CNTT";"Ngành A, B""C"\r\nFME;Khoa Cơ khí;\r\n\r\n';
    expect(parseCsvMatrix(csv)).toEqual([
      ['code', 'name', 'description'],
      ['FIT', 'Khoa CNTT', 'Ngành A, B"C'],
      ['FME', 'Khoa Cơ khí', ''],
    ]);
  });

  it('parseImportFilePreview cắt theo maxPreviewRows và kiểm tra thiếu cột bắt buộc', async () => {
    const lines = ['code,description', 'FIT,Khoa CNTT', 'FME,Khoa Cơ khí', 'EEE,Khoa Điện'];
    const file = new File([lines.join('\n')], 'faculties.csv', { type: 'text/csv' });

    const preview = await parseImportFilePreview(file, {
      maxPreviewRows: 2,
      requiredColumns: ['code', 'name'],
    });

    expect(preview.fileFormat).toBe('csv');
    expect(preview.headers).toEqual(['code', 'description']);
    expect(preview.rows).toEqual([
      ['FIT', 'Khoa CNTT'],
      ['FME', 'Khoa Cơ khí'],
    ]);
    expect(preview.totalRows).toBe(3);
    expect(preview.truncated).toBe(true);
    expect(preview.missingRequiredColumns).toEqual(['name']);
    expect(preview.unreadable).toBe(false);
  });

  it('parseImportFilePreview cảnh báo khi tệp CSV chỉ có dòng tiêu đề', async () => {
    const file = new File(['code,name\n'], 'empty-rows.csv', { type: 'text/csv' });
    const preview = await parseImportFilePreview(file, { requiredColumns: ['code', 'name'] });

    expect(preview.headers).toEqual(['code', 'name']);
    expect(preview.rows).toEqual([]);
    expect(preview.totalRows).toBe(0);
    expect(preview.missingRequiredColumns).toEqual([]);
    expect(preview.warnings[0]).toContain('chưa có dòng dữ liệu');
  });

  it('parseImportFilePreview đọc đúng bảng tính đầu tiên của tệp .xlsx kèm ô thưa (sparse)', async () => {
    const zipBytes = buildStoredZip([
      {
        name: 'xl/workbook.xml',
        content: '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        content: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      },
      {
        name: 'xl/sharedStrings.xml',
        content: '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>code</t></si><si><t>name</t></si><si><t>description</t></si><si><t>FIT</t></si><si><t>Khoa CNTT</t></si></sst>',
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        content: '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2" t="s"><v>3</v></c><c r="C2" t="inlineStr"><is><t>Ghi chú</t></is></c></row></sheetData></worksheet>',
      },
    ]);

    const xlsxFile = new File([new Uint8Array(zipBytes)], 'faculties.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const preview = await parseImportFilePreview(xlsxFile, { requiredColumns: ['code', 'name'] });
    expect(preview.fileFormat).toBe('xlsx');
    expect(preview.unreadable).toBe(false);
    expect(preview.headers).toEqual(['code', 'name', 'description']);
    expect(preview.rows).toEqual([['FIT', '', 'Ghi chú']]);
    expect(preview.totalRows).toBe(1);
    expect(preview.missingRequiredColumns).toEqual([]);
  });

  it('parseImportFilePreview trả về unreadable=true kèm cảnh báo khi tệp .xlsx không đọc được trên trình duyệt', async () => {
    const invalidXlsx = new File(['PK'], 'khoa.xlsx');
    const preview = await parseImportFilePreview(invalidXlsx);

    expect(preview.fileFormat).toBe('xlsx');
    expect(preview.unreadable).toBe(true);
    expect(preview.headers).toEqual([]);
    expect(preview.warnings[0]).toContain('Không thể đọc bảng xem trước');
  });
});
