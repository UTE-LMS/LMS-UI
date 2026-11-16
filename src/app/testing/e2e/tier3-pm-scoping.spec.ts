import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCourseLockedError,
  createMockCourse,
  createMockFacultyList,
  createMockProgram,
  createPmAuthService,
  createProgramLockedError,
  getRootElement,
  IFaculty,
  PmScopingHarnessComponent,
} from './test-helpers';

describe('Tier 3 Opaque-Box: Program Manager Faculty Scoping & 422 Locked Modals (F8 - F9)', () => {
  let fixture: ComponentFixture<PmScopingHarnessComponent>;
  let component: PmScopingHarnessComponent;

  const mockFaculties: IFaculty[] = createMockFacultyList();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PmScopingHarnessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PmScopingHarnessComponent);
    component = fixture.componentInstance;
    component.faculties.set(mockFaculties);
    fixture.detectChanges();
  });

  // ==========================================================================
  // Feature F8: PM Faculty Scoping & Form Locking (principal.facultyId)
  // ==========================================================================
  describe('F8: PM Faculty Scoping & Form Locking', () => {
    it('T1-F8-01: PROGRAM_MANAGER đăng nhập có principal.facultyId xác định phạm vi quản lý', () => {
      const pmAuth = createPmAuthService('fac_cntt_01');
      expect(pmAuth.isAuthenticated()).toBe(true);
      expect(pmAuth.isProgramManager()).toBe(true);
      expect(pmAuth.getFacultyId()).toBe('fac_cntt_01');
    });

    it('T1-F8-02: giao diện hiển thị banner thông báo cố định phạm vi theo Khoa phụ trách', () => {
      component.currentFacultyId.set('fac_cntt_01');
      component.currentFacultyName.set('Khoa Công nghệ Thông tin');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const banner = root.querySelector('#pmScopeBanner') as HTMLElement;
      expect(banner).not.toBeNull();
      expect(banner.textContent).toContain('Khoa Công nghệ Thông tin');
      expect(banner.textContent).toContain('fac_cntt_01');
    });

    it('T1-F8-03: mở modal Tạo mới CTĐT thì dropdown Khoa bị khóa cứng (disabled: true) theo principal.facultyId', () => {
      component.currentFacultyId.set('fac_cntt_01');
      component.syncScopedFaculty();
      component.openCreateProgramModal();
      fixture.detectChanges();

      expect(component.programModalVisible()).toBe(true);
      expect(component.programForm.get('facultyId')?.value).toBe('fac_cntt_01');
      expect(component.programForm.get('facultyId')?.disabled).toBe(true);

      const root = getRootElement(fixture);
      const select = root.querySelector('#scopedFacultySelect') as HTMLSelectElement;
      expect(select.disabled).toBe(true);
    });

    it('T1-F8-04: mở modal Tạo mới Học phần thì dropdown Khoa cũng bị khóa cứng theo principal.facultyId', () => {
      component.currentFacultyId.set('fac_cntt_01');
      component.syncScopedFaculty();
      component.openCreateCourseModal();
      fixture.detectChanges();

      expect(component.courseModalVisible()).toBe(true);
      expect(component.courseForm.get('facultyId')?.value).toBe('fac_cntt_01');
      expect(component.courseForm.get('facultyId')?.disabled).toBe(true);

      const root = getRootElement(fixture);
      const select = root.querySelector('#scopedCourseFacultySelect') as HTMLSelectElement;
      expect(select.disabled).toBe(true);
    });

    it('T1-F8-05: submit tạo mới CTĐT và Học phần gửi payload có facultyId đúng với principal.facultyId', () => {
      component.currentFacultyId.set('fac_cntt_01');
      component.syncScopedFaculty();

      let programPayload: { facultyId?: string; code?: string; name?: string; } | undefined;
      component.onSubmitProgram = (val: unknown) => {
        programPayload = val as { facultyId?: string; code?: string; name?: string; };
      };

      component.openCreateProgramModal();
      component.programForm.patchValue({ code: '7480104', name: 'Hệ thống Thông tin' });
      fixture.detectChanges();

      component.submitProgram();
      expect(programPayload).toBeDefined();
      expect(programPayload?.facultyId).toBe('fac_cntt_01');
      expect(programPayload?.code).toBe('7480104');
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F8-06: PM không có facultyId được chỉ định sẽ khóa toàn bộ các nút tạo mới', () => {
      const pmNoFacAuth = createPmAuthService('');
      expect(pmNoFacAuth.getFacultyId()).toBe('');
    });

    it('T2-F8-07: mở modal sửa CTĐT vẫn giữ nguyên trường Khoa bị disable', () => {
      const prog = createMockProgram({ id: 'prog_se', facultyId: 'fac_cntt_01', code: '7480103', name: 'Kỹ thuật Phần mềm' });
      component.openEditProgramModal(prog);
      fixture.detectChanges();

      expect(component.isEditingProgram()).toBe(true);
      expect(component.programForm.get('facultyId')?.disabled).toBe(true);
      expect(component.programForm.get('code')?.value).toBe('7480103');
    });

    it('T2-F8-08: mở modal sửa Học phần vẫn giữ nguyên trường Khoa bị disable', () => {
      const crs = createMockCourse({ id: 'crs_oop', facultyId: 'fac_cntt_01', code: 'OOPR230279', name: 'Lập trình OOP', credits: 3 });
      component.openEditCourseModal(crs);
      fixture.detectChanges();

      expect(component.isEditingCourse()).toBe(true);
      expect(component.courseForm.get('facultyId')?.disabled).toBe(true);
      expect(component.courseForm.get('credits')?.value).toBe(3);
    });

    it('T2-F8-09: form CTĐT yêu cầu đầy đủ mã và tên CTĐT mới cho phép lưu', () => {
      component.openCreateProgramModal();
      fixture.detectChanges();

      component.programForm.patchValue({ code: '', name: '' });
      expect(component.programForm.invalid).toBe(true);

      component.programForm.patchValue({ code: '7480103', name: '' });
      expect(component.programForm.invalid).toBe(true);

      component.programForm.patchValue({ code: '7480103', name: 'Kỹ thuật Phần mềm' });
      expect(component.programForm.valid).toBe(true);
    });

    it('T2-F8-10: form Học phần yêu cầu số tín chỉ tối thiểu là 1', () => {
      component.openCreateCourseModal();
      fixture.detectChanges();

      component.courseForm.patchValue({ code: 'CS101', name: 'Tin học đại cương', credits: 0 });
      expect(component.courseForm.invalid).toBe(true);

      component.courseForm.patchValue({ code: 'CS101', name: 'Tin học đại cương', credits: 3 });
      expect(component.courseForm.valid).toBe(true);
    });
  });

  // ==========================================================================
  // Feature F9: PM 422 Locked Entity Warning Modals
  // ==========================================================================
  describe('F9: PM 422 Locked Entity Warning Modals', () => {
    it('T1-F9-01: sửa học phần có phiên bản CTĐT ACTIVE/ARCHIVED nhận lỗi 422 COURSE_LOCKED_BY_PROGRAM_VERSION', () => {
      const err = createCourseLockedError();
      expect(err.status).toBe(422);
      const errBody = err.error as { code?: string; };
      expect(errBody.code).toBe('COURSE_LOCKED_BY_PROGRAM_VERSION');
    });

    it('T1-F9-02: giao diện bắt lỗi 422 khi sửa học phần và hiển thị modal cảnh báo người dùng', () => {
      const err = createCourseLockedError('Học phần đã có phiên bản CTĐT ban hành (ACTIVE/ARCHIVED). Không được chỉnh sửa.');
      component.handleLockedError(err);
      fixture.detectChanges();

      expect(component.lockedWarningModalVisible()).toBe(true);
      const root = getRootElement(fixture);
      const modal = root.querySelector('#lockedEntityWarningModal') as HTMLElement;
      expect(modal).not.toBeNull();
      expect(modal.textContent).toContain('Thao tác bị từ chối (422 Locked)');
      expect(modal.textContent).toContain('Học phần đã có phiên bản CTĐT ban hành');
    });

    it('T1-F9-03: người dùng bấm Đã hiểu để đóng modal cảnh báo khóa học phần', () => {
      component.lockedWarningModalVisible.set(true);
      component.lockedWarningMessage.set('Cảnh báo khóa học phần');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const closeBtn = root.querySelector('#btnCloseLockedWarning') as HTMLButtonElement;
      closeBtn.click();
      fixture.detectChanges();

      expect(component.lockedWarningModalVisible()).toBe(false);
      expect(root.querySelector('#lockedEntityWarningModal')).toBeNull();
    });

    it('T1-F9-04: sửa CTĐT có phiên bản ACTIVE/ARCHIVED nhận lỗi 422 PROGRAM_LOCKED_BY_VERSION', () => {
      const err = createProgramLockedError();
      expect(err.status).toBe(422);
      const errBody = err.error as { code?: string; };
      expect(errBody.code).toBe('PROGRAM_LOCKED_BY_VERSION');
    });

    it('T1-F9-05: giao diện bắt lỗi 422 khi sửa CTĐT và hiển thị cảnh báo không cho sửa mã hoặc tên', () => {
      const err = createProgramLockedError('Chương trình đào tạo đã có phiên bản ban hành (ACTIVE/ARCHIVED). Không được chỉnh sửa mã hoặc tên.');
      component.handleLockedError(err);
      fixture.detectChanges();

      expect(component.lockedWarningModalVisible()).toBe(true);
      const root = getRootElement(fixture);
      const modal = root.querySelector('#lockedEntityWarningModal') as HTMLElement;
      expect(modal).not.toBeNull();
      expect(modal.textContent).toContain('Chương trình đào tạo đã có phiên bản ban hành');
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F9-06: sửa học phần thuộc phiên bản DRAFT thành công và không ném lỗi 422', () => {
      let submitCalled = false;
      component.onSubmitCourse = () => {
        submitCalled = true;
      };

      const crs = createMockCourse({ id: 'crs_draft', facultyId: 'fac_cntt_01', code: 'DRF101', name: 'Môn thử nghiệm nháp', credits: 2 });
      component.openEditCourseModal(crs);
      component.courseForm.patchValue({ name: 'Môn thử nghiệm nháp v2' });
      fixture.detectChanges();

      component.submitCourse();
      expect(submitCalled).toBe(true);
      expect(component.lockedWarningModalVisible()).toBe(false);
    });

    it('T2-F9-07: sửa CTĐT chỉ có phiên bản DRAFT thành công và không ném lỗi 422', () => {
      let submitCalled = false;
      component.onSubmitProgram = () => {
        submitCalled = true;
      };

      const prog = createMockProgram({ id: 'prog_draft', facultyId: 'fac_cntt_01', code: 'DRF_PROG', name: 'CTĐT mới mở' });
      component.openEditProgramModal(prog);
      component.programForm.patchValue({ name: 'CTĐT mới mở cập nhật' });
      fixture.detectChanges();

      component.submitProgram();
      expect(submitCalled).toBe(true);
      expect(component.lockedWarningModalVisible()).toBe(false);
    });

    it('T2-F9-08: lỗi 422 trả về không có message body tự động hiển thị thông báo mặc định tiếng Việt', () => {
      const emptyMsgErr = createCourseLockedError('');
      component.handleLockedError(emptyMsgErr);
      fixture.detectChanges();

      expect(component.lockedWarningModalVisible()).toBe(true);
      expect(component.lockedWarningMessage()).toBe('Đối tượng đã bị khóa bởi phiên bản ban hành (ACTIVE/ARCHIVED).');
    });

    it('T2-F9-09: nhiều lỗi 422 liên tiếp trên các đối tượng khác nhau đều kích hoạt modal đúng nội dung', () => {
      const err1 = createCourseLockedError('Khóa học phần 1');
      component.handleLockedError(err1);
      fixture.detectChanges();
      expect(component.lockedWarningMessage()).toBe('Khóa học phần 1');

      component.lockedWarningModalVisible.set(false);
      fixture.detectChanges();

      const err2 = createProgramLockedError('Khóa chương trình 2');
      component.handleLockedError(err2);
      fixture.detectChanges();
      expect(component.lockedWarningMessage()).toBe('Khóa chương trình 2');
    });

    it('T2-F9-10: đóng modal cảnh báo 422 không gửi lại request và không làm thay đổi trạng thái dữ liệu', () => {
      component.lockedWarningModalVisible.set(true);
      fixture.detectChanges();

      component.lockedWarningModalVisible.set(false);
      fixture.detectChanges();

      expect(component.lockedWarningModalVisible()).toBe(false);
    });
  });
});
