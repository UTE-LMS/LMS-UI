import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ISection } from '@models/course/section.model';
import { SectionService } from '@services/course/section.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { ToastrService } from 'ngx-toastr';
import { of, Subject, throwError } from 'rxjs';
import { SectionModalComponent } from './section-modal.component';

/** DỮ LIỆU THỬ NGHIỆM: ID, mã lớp giả. */
describe('SectionModalComponent (F05a US-19)', () => {
  let fixture: ComponentFixture<SectionModalComponent>;
  let component: SectionModalComponent;

  const lecturerId = '671dcba5f123456789abcd11';
  const created: ISection = {
    id: 'sec1', code: 'TEST101-01', courseId: 'c1', syllabusId: 's1', termId: 't1',
    lecturerIds: [lecturerId], enrolledCount: 0, status: 'OPEN',
  };

  const sectionSvc = { createSection: vi.fn(), updateLecturers: vi.fn() };
  const syllabusSvc = {
    getSyllabiByCourse: vi.fn(() => of([
      { id: 's1', courseId: 'c1', version: '1', status: 'CONFIRMED' },
      { id: 's2', courseId: 'c1', version: '2', status: 'DRAFT' },
    ])),
  };
  const alertSvc = { success: vi.fn(), error: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    sectionSvc.createSection.mockReturnValue(of(created));
    sectionSvc.updateLecturers.mockReturnValue(of({ ...created, lecturerIds: [lecturerId, '671dcba5f123456789abcd12'] }));
    await TestBed.configureTestingModule({
      imports: [SectionModalComponent],
      providers: [
        { provide: SectionService, useValue: sectionSvc },
        { provide: SyllabusService, useValue: syllabusSvc },
        { provide: ToastrService, useValue: alertSvc },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SectionModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('terms', [{ id: 't1', code: '2026-HK1', status: 'OPEN' }]);
    fixture.componentRef.setInput('courses', [{ id: 'c1', code: 'TEST101', name: 'Học phần thử nghiệm' }]);
    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();
  });

  function fillValid(): void {
    component.form.patchValue({
      code: 'TEST101-01', termId: 't1', courseId: 'c1', syllabusId: 's1', lecturerIds: [lecturerId],
    });
  }

  it('US-19/AC-1: mở lớp gửi đúng body và báo thành công', () => {
    const saved = vi.fn();
    component.saved.subscribe(saved);
    fillValid();
    component.submit();
    expect(sectionSvc.createSection).toHaveBeenCalledWith({
      code: 'TEST101-01', courseId: 'c1', syllabusId: 's1', termId: 't1', lecturerIds: [lecturerId],
    });
    expect(saved).toHaveBeenCalledWith(created);
    expect(alertSvc.success).toHaveBeenCalled();
  });

  it('chọn học phần thì tải các đề cương của học phần đó và xóa lựa chọn đề cương cũ', () => {
    component.form.controls.syllabusId.setValue('s1');
    component.onCourseChange('c1');
    expect(syllabusSvc.getSyllabiByCourse).toHaveBeenCalledWith('c1');
    expect(component.syllabi().length).toBe(2);
    expect(component.form.controls.syllabusId.value).toBe('');
  });

  it('ca âm: thiếu trường bắt buộc thì không gọi API', () => {
    component.submit();
    expect(sectionSvc.createSection).not.toHaveBeenCalled();
  });

  it('ca âm: mã lớp sai định dạng (có khoảng trắng) bị chặn ở client', () => {
    fillValid();
    component.form.controls.code.setValue('TEST 101');
    component.submit();
    expect(sectionSvc.createSection).not.toHaveBeenCalled();
  });

  it('ca âm: không chọn giảng viên nào thì báo lỗi và không gọi API (US-19/AC-1 cần ≥ 1 giảng viên)', () => {
    fillValid();
    component.form.controls.lecturerIds.setValue([]);
    component.submit();
    expect(sectionSvc.createSection).not.toHaveBeenCalled();
    expect(component.submitError()).toContain('ít nhất một giảng viên');
  });

  it('ca âm: ID giảng viên dán vào sai định dạng thì bị chặn', () => {
    fillValid();
    component.form.controls.lecturerIds.setValue(['khong-phai-objectid']);
    component.submit();
    expect(sectionSvc.createSection).not.toHaveBeenCalled();
    expect(component.submitError()).toContain('24 ký tự hex');
  });

  it('biên: ID giảng viên trùng và có khoảng trắng được làm sạch trước khi gửi', () => {
    fillValid();
    component.form.controls.lecturerIds.setValue([` ${lecturerId} `, lecturerId]);
    component.submit();
    expect((sectionSvc.createSection.mock.calls[0][0] as { lecturerIds: string[]; }).lecturerIds).toEqual([lecturerId]);
  });

  it('US-19/AC-3: 409 trùng mã lớp hiện thông điệp backend và giữ nguyên dữ liệu đã nhập', () => {
    sectionSvc.createSection.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { status: 409, code: 'CONFLICT', message: 'Mã lớp học phần [TEST101-01] đã tồn tại trong hệ thống' },
    })));
    fillValid();
    component.submit();
    expect(component.submitError()).toContain('đã tồn tại');
    expect(component.form.controls.code.value).toBe('TEST101-01');
    expect(component.isSubmitting()).toBe(false);
  });

  it('US-19/AC-2: 422 đề cương chưa duyệt hiện thông điệp backend', () => {
    sectionSvc.createSection.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422, error: { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Chỉ được mở lớp trên đề cương đã chốt (CONFIRMED)' },
    })));
    fillValid();
    component.submit();
    expect(component.submitError()).toContain('đề cương đã chốt');
  });

  it('chống bấm đúp: đang gửi thì lần submit thứ hai bị bỏ qua', () => {
    sectionSvc.createSection.mockReturnValue(new Subject());
    fillValid();
    component.submit();
    component.submit();
    expect(component.isSubmitting()).toBe(true);
    expect(sectionSvc.createSection).toHaveBeenCalledTimes(1);
  });

  it('chế độ sửa: chỉ gửi lecturerIds qua updateLecturers, không đụng học phần/đề cương/học kỳ', () => {
    fixture.componentRef.setInput('isVisible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('section', created);
    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();
    component.form.controls.lecturerIds.setValue([lecturerId, '671dcba5f123456789abcd12']);
    component.submit();
    expect(sectionSvc.updateLecturers).toHaveBeenCalledWith('sec1', { lecturerIds: [lecturerId, '671dcba5f123456789abcd12'] });
    expect(sectionSvc.createSection).not.toHaveBeenCalled();
  });
});
