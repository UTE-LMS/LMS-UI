import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ISection } from '@models/course/section.model';
import { EnrollmentService } from '@services/course/enrollment.service';
import { SectionService } from '@services/course/section.service';
import { TermService } from '@services/course/term.service';
import { of, Subject, throwError } from 'rxjs';
import { RosterImportComponent } from './roster-import.component';

/** DỮ LIỆU THỬ NGHIỆM: mã sinh viên SV-xxxx, tệp CSV và ID giả. */
describe('RosterImportComponent (F05a US-20)', () => {
  let fixture: ComponentFixture<RosterImportComponent>;
  let component: RosterImportComponent;

  const section: ISection = {
    id: 'sec1', code: 'TEST101-01', courseId: 'c1', syllabusId: 's1', termId: 't1',
    lecturerIds: ['u1'], enrolledCount: 0, status: 'OPEN',
  };
  const sectionSvc = { getSection: vi.fn() };
  const termSvc = { getTermById: vi.fn() };
  const enrollmentSvc = { importEnrollments: vi.fn() };

  async function setup(opts: { section?: ISection; termStatus?: 'OPEN' | 'SCORE_LOCKED' | 'CLOSED'; } = {}): Promise<void> {
    vi.clearAllMocks();
    sectionSvc.getSection.mockReturnValue(of(opts.section ?? section));
    termSvc.getTermById.mockReturnValue(of({ id: 't1', code: '2026-HK1', status: opts.termStatus ?? 'OPEN' }));
    await TestBed.configureTestingModule({
      imports: [RosterImportComponent],
      providers: [
        provideRouter([]),
        { provide: SectionService, useValue: sectionSvc },
        { provide: TermService, useValue: termSvc },
        { provide: EnrollmentService, useValue: enrollmentSvc },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RosterImportComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sectionId', 'sec1');
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const csv = (name = 'lop.csv', body = 'studentRef\nSV-0001\n'): File => new File([body], name, { type: 'text/csv' });
  function pick(file: File): void {
    const input = el().querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
  const submitButton = (): HTMLButtonElement => Array.from(el().querySelectorAll('app-action-dock button')).find(b => (b.textContent ?? '').includes('Ghi danh')) as HTMLButtonElement;

  it('trạng thái ban đầu: chưa chọn tệp thì nút Ghi danh bị vô hiệu hóa và thanh dưới hướng dẫn chọn tệp', async () => {
    await setup();
    expect(submitButton().disabled).toBe(true);
    expect(el().querySelector('app-action-dock')?.textContent).toContain('Chọn tệp CSV danh sách lớp');
  });

  it('US-20/AC-3: tệp không phải CSV bị từ chối ngay ở bước chọn tệp với thông báo rõ', async () => {
    await setup();
    pick(csv('lop.xlsx'));
    expect(component.file()).toBeNull();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Chỉ nhận tệp CSV');
    expect(submitButton().disabled).toBe(true);
  });

  it('US-20/AC-3: tệp rỗng bị từ chối', async () => {
    await setup();
    pick(csv('lop.csv', ''));
    expect(component.fileError()).toContain('rỗng');
    expect(component.file()).toBeNull();
  });

  it('US-20/AC-1: tệp hợp lệ được gửi và kết quả hiện số dòng, sinh viên mới/dùng lại, sĩ số và cột bị bỏ qua', async () => {
    await setup();
    enrollmentSvc.importEnrollments.mockReturnValue(of({
      sectionId: 'sec1', totalRows: 5, newStudents: 3, reusedStudents: 2, sectionEnrolledCount: 5, ignoredColumns: ['hoTen', 'email'],
    }));
    pick(csv());
    expect(submitButton().disabled).toBe(false);
    component.submit();
    fixture.detectChanges();
    expect(enrollmentSvc.importEnrollments).toHaveBeenCalledWith('sec1', expect.any(File));
    expect(component.step()).toBe('DONE');
    const text = el().textContent ?? '';
    expect(text).toContain('Đã ghi danh 5 dòng');
    expect(text).toContain('3 sinh viên mới, 2 đã có hồ sơ');
    expect(text).toContain('hoTen, email');
  });

  it('US-20/AC-2: 422 kèm lỗi theo dòng hiện bảng Dòng/Giá trị/Lỗi, nói rõ chưa ghi gì và khóa nút Ghi danh', async () => {
    await setup();
    enrollmentSvc.importEnrollments.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      error: {
        status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Tệp có dòng lỗi',
        fieldErrors: [
          { field: 'line 12', message: 'Thiếu studentRef', rejectedValue: '' },
          { field: 'line 30', message: 'studentRef trùng với dòng 17 trong tệp', rejectedValue: 'SV-0018' },
          { field: 'line 41', message: 'Sinh viên đã ghi danh lớp này', rejectedValue: 'SV-0022' },
        ],
      },
    })));
    pick(csv());
    component.submit();
    fixture.detectChanges();
    const rows = Array.from(el().querySelectorAll('tbody tr.ant-table-row')).map(r => (r.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(rows.length).toBe(3);
    expect(rows[0]).toContain('12');
    expect(rows[0]).toContain('(trống)');
    expect(rows[1]).toContain('SV-0018');
    expect(rows[2]).toContain('Sinh viên đã ghi danh lớp này');
    expect(el().textContent).toContain('3 dòng lỗi');
    expect(el().textContent).toContain('chưa có sinh viên nào được ghi danh');
    expect(component.step()).toBe('PICK');
    expect(submitButton().disabled).toBe(true);
  });

  it('400 tệp sai cột (không có fieldErrors) hiện thông điệp backend, không hiện bảng lỗi theo dòng', async () => {
    await setup();
    enrollmentSvc.importEnrollments.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { status: 400, code: 'VALIDATION_ERROR', message: 'Tệp thiếu cột studentRef' },
    })));
    pick(csv());
    component.submit();
    fixture.detectChanges();
    expect(component.rowErrors()).toEqual([]);
    expect(component.submitError()).toContain('thiếu cột studentRef');
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('thiếu cột studentRef');
  });

  it('422 lớp đã đóng (không có fieldErrors) hiện thông điệp backend', async () => {
    await setup();
    enrollmentSvc.importEnrollments.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422, error: { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Không thể đổi danh sách ghi danh vì lớp đang ở trạng thái CLOSED' },
    })));
    pick(csv());
    component.submit();
    expect(component.submitError()).toContain('lớp đang ở trạng thái CLOSED');
  });

  it('chống bấm đúp: đang gửi thì lần submit thứ hai bị bỏ qua', async () => {
    await setup();
    enrollmentSvc.importEnrollments.mockReturnValue(new Subject());
    pick(csv());
    component.submit();
    component.submit();
    expect(enrollmentSvc.importEnrollments).toHaveBeenCalledTimes(1);
    expect(component.isSubmitting()).toBe(true);
  });

  it('lớp không còn OPEN: báo trước và không gửi tệp', async () => {
    await setup({ section: { ...section, status: 'LOCKED' } });
    expect(component.frozenReason()).toContain('đóng băng');
    expect(el().querySelector('app-action-dock')?.textContent).toContain('đóng băng');
    const input = el().querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    component.file.set(csv());
    component.submit();
    expect(enrollmentSvc.importEnrollments).not.toHaveBeenCalled();
  });

  it('học kỳ đã khóa sổ điểm: không cho nhập danh sách dù lớp còn OPEN', async () => {
    await setup({ termStatus: 'SCORE_LOCKED' });
    expect(component.frozenReason()).toContain('2026-HK1');
  });
});
