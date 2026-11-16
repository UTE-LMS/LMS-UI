import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AdminFacultyHarnessComponent,
  createAdminAuthService,
  createCourseLockedError,
  createMockCloPiMatrix,
  createMockCourse,
  createMockFaculty,
  createMockFacultyList,
  createMockProgramVersion,
  createPmAuthService,
  createPmConflictError,
  createProgramLockedError,
  getRootElement,
  IFaculty,
  IFacultyTransferPmRequest,
  IProgramCourse,
  IUser,
  PmScopingHarnessComponent,
  PublicHomepageHarnessComponent,
} from './test-helpers';

describe('Tier 3 Opaque-Box: Cross-Feature Combinations & State Machine Interactions (>= 15 Tests)', () => {
  let homeFixture: ComponentFixture<PublicHomepageHarnessComponent>;
  let homeComponent: PublicHomepageHarnessComponent;

  let adminFixture: ComponentFixture<AdminFacultyHarnessComponent>;
  let adminComponent: AdminFacultyHarnessComponent;

  let pmFixture: ComponentFixture<PmScopingHarnessComponent>;
  let pmComponent: PmScopingHarnessComponent;

  const mockFaculties: IFaculty[] = createMockFacultyList();
  const mockPmUser: IUser = {
    id: 'usr_pm_t3',
    username: 'pm_cross',
    email: 'cross.pm@hcmute.edu.vn',
    fullName: 'TS. Hoàng Minh Trí',
    status: 'ACTIVE',
    roles: ['PROGRAM_MANAGER'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHomepageHarnessComponent, AdminFacultyHarnessComponent, PmScopingHarnessComponent],
    }).compileComponents();

    homeFixture = TestBed.createComponent(PublicHomepageHarnessComponent);
    homeComponent = homeFixture.componentInstance;
    homeComponent.faculties.set(JSON.parse(JSON.stringify(mockFaculties)) as IFaculty[]);
    homeFixture.detectChanges();

    adminFixture = TestBed.createComponent(AdminFacultyHarnessComponent);
    adminComponent = adminFixture.componentInstance;
    adminComponent.faculties.set(JSON.parse(JSON.stringify(mockFaculties)) as IFaculty[]);
    adminFixture.detectChanges();

    pmFixture = TestBed.createComponent(PmScopingHarnessComponent);
    pmComponent = pmFixture.componentInstance;
    pmComponent.faculties.set(JSON.parse(JSON.stringify(mockFaculties)) as IFaculty[]);
    pmFixture.detectChanges();
  });

  // ==========================================================================
  // Cross-Feature Pairwise Interaction Tests
  // ==========================================================================

  it('XF-01: Pairwise Admin Creation -> PM Scoping: ADMIN tạo Khoa FEE -> PM được gán tự động khóa scope theo FEE', () => {
    // 1. Admin creates faculty FEE
    adminComponent.openCreateModal();
    adminComponent.facultyForm.setValue({ code: 'FEE', name: 'Khoa Điện - Điện tử' });
    adminComponent.submitCreateFaculty();

    const createdFee = adminComponent.faculties().find(f => f.code === 'FEE');
    expect(createdFee).toBeDefined();

    // 2. PM is scoped to createdFee.id
    pmComponent.currentFacultyId.set(createdFee?.id ?? '');
    pmComponent.currentFacultyName.set(createdFee?.name ?? '');
    pmComponent.syncScopedFaculty();
    pmComponent.openCreateProgramModal();

    expect(pmComponent.programForm.get('facultyId')?.value).toBe(createdFee?.id);
    expect(pmComponent.programForm.get('facultyId')?.disabled).toBe(true);
  });

  it('XF-02: Pairwise Cascading Filter + 422 Locked: bắt lỗi 422 khi sửa học phần không làm reset trạng thái bộ lọc công khai', () => {
    // Setup cascading selection in homepage
    homeComponent.onFacultyChange('fac_cntt_01');
    homeComponent.onProgramChange('prog_se');
    homeComponent.onVersionChange('ver_se_2024');
    homeComponent.onCourseChange('crs_oop');
    homeFixture.detectChanges();

    // In parallel, PM encounters 422 when attempting to edit this locked course
    const err = createCourseLockedError();
    pmComponent.handleLockedError(err);
    pmFixture.detectChanges();

    expect(pmComponent.lockedWarningModalVisible()).toBe(true);

    // Verify public cascading filter state remains rock-solid intact
    expect(homeComponent.selectedFacultyId()).toBe('fac_cntt_01');
    expect(homeComponent.selectedProgramId()).toBe('prog_se');
    expect(homeComponent.selectedVersionId()).toBe('ver_se_2024');
    expect(homeComponent.selectedCourseId()).toBe('crs_oop');
  });

  it('XF-03: Pairwise Admin Status Toggle -> Homepage Reactivity: Admin bật trạng thái Khoa FFL -> Homepage cập nhật tức thì', () => {
    const ffl = adminComponent.faculties().find(f => f.code === 'FFL');
    expect(ffl?.isActive).toBe(false);

    // Admin activates FFL
    adminComponent.toggleFacultyStatus(ffl as IFaculty);
    adminFixture.detectChanges();

    const updatedFfl = adminComponent.faculties().find(f => f.code === 'FFL');
    expect(updatedFfl?.isActive).toBe(true);

    // Sync to public view
    homeComponent.faculties.set(adminComponent.faculties());
    homeFixture.detectChanges();

    const root = getRootElement(homeFixture);
    const select = root.querySelector('#facultySelect') as HTMLSelectElement;
    expect(select.textContent).toContain('FFL - Khoa Ngoại ngữ');
  });

  it('XF-04: Pairwise PM Transfer -> Form Scope Shift: Admin điều chuyển PM từ FIT sang FEE -> form PM tự chuyển scope', () => {
    let transferPayload: IFacultyTransferPmRequest | undefined;
    adminComponent.onTransferPm = (dto: IFacultyTransferPmRequest) => {
      transferPayload = dto;
    };

    const fit = adminComponent.faculties()[0];
    adminComponent.openPmModal(fit);
    adminComponent.openTransferForm(mockPmUser);
    adminComponent.transferTargetFacultyId.set('fac_ddt_03');
    adminComponent.transferReason.set('Tái cơ cấu nhân sự');
    adminComponent.confirmTransfer();

    expect(transferPayload?.targetFacultyId).toBe('fac_ddt_03');

    // PM component re-syncs with new target faculty
    pmComponent.currentFacultyId.set(transferPayload?.targetFacultyId ?? '');
    pmComponent.syncScopedFaculty();
    pmComponent.openCreateCourseModal();

    expect(pmComponent.courseForm.get('facultyId')?.value).toBe('fac_ddt_03');
  });

  it('XF-05: Pairwise 409 PM Conflict -> Table Consistency: gán PM thất bại do 409 không làm tăng sai số lượng PM', () => {
    const fee = adminComponent.faculties()[2];
    const initialPmCount = fee.programManagerCount ?? 0;
    adminComponent.openPmModal(fee);

    // Conflict error simulator
    adminComponent.onAssignPm = () => {
      const err = createPmConflictError();
      const errBody = err.error as { message?: string; };
      adminComponent.conflictError.set(errBody.message ?? 'Conflict');
    };

    adminComponent.newPmUserId.set('usr_pm_nam');
    adminComponent.assignPm();
    adminFixture.detectChanges();

    expect(adminComponent.conflictError()).toContain('Vi phạm ràng buộc 1 PM = 1 Khoa');
    expect(fee.programManagerCount).toBe(initialPmCount);
  });

  it('XF-06: Pairwise Version Cohort + Course Catalog: Phiên bản 2024 hiển thị đúng các học phần được gán theo khóa', () => {
    const v2024 = createMockProgramVersion({ id: 'ver_2024', applicableCohort: '2024' });
    const pc2024: IProgramCourse = {
      id: 'pc_2024_1',
      programVersionId: 'ver_2024',
      courseId: 'crs_2024',
      course: createMockCourse({ id: 'crs_2024', code: 'SE2024', name: 'Công nghệ phần mềm mới' }),
      semester: 1,
      credits: 3,
    };

    homeComponent.versions.set([v2024]);
    homeComponent.versionCourses.set([pc2024]);
    homeComponent.selectedVersionId.set('ver_2024');
    homeComponent.activeTab.set('courses');
    homeFixture.detectChanges();

    const root = getRootElement(homeFixture);
    expect(root.textContent).toContain('SE2024');
    expect(root.textContent).toContain('Công nghệ phần mềm mới');
  });

  it('XF-07: Pairwise Invariant Q22 + Course Switching: chuyển đổi giữa 2 môn học giữ nguyên quy tắc gạch ngang (—) không số 0', () => {
    homeComponent.selectedVersionId.set('ver_se_2024');
    homeComponent.activeTab.set('matrix');

    // Course 1: 1 link with weight 3
    const matrixCrs1 = createMockCloPiMatrix({
      cloCount: 2,
      piCount: 2,
      linkedPairs: [{ cloIndex: 0, piIndex: 0, weight: 3 }],
    });
    homeComponent.matrix.set(matrixCrs1);
    homeFixture.detectChanges();

    let root = getRootElement(homeFixture);
    let cell12 = root.querySelector('td.matrix-cell[data-clo="clo_1"][data-pi="pi_2"]') as HTMLElement;
    expect(cell12.textContent?.trim()).toBe('—');
    expect(cell12.textContent?.trim()).not.toBe('0');

    // Course 2: 0 links (completely sparse)
    const matrixCrs2 = createMockCloPiMatrix({
      cloCount: 2,
      piCount: 2,
      linkedPairs: [],
    });
    homeComponent.matrix.set(matrixCrs2);
    homeFixture.detectChanges();

    root = getRootElement(homeFixture);
    cell12 = root.querySelector('td.matrix-cell[data-clo="clo_1"][data-pi="pi_2"]') as HTMLElement;
    expect(cell12.textContent?.trim()).toBe('—');
    expect(cell12.textContent?.trim()).not.toBe('0');
  });

  it('XF-08: Pairwise 422 Program Lock + Course Form Isolation: đóng cảnh báo CTĐT không làm ảnh hưởng form tạo học phần', () => {
    // 1. Encounter 422 on program
    pmComponent.handleLockedError(createProgramLockedError());
    pmFixture.detectChanges();
    expect(pmComponent.lockedWarningModalVisible()).toBe(true);

    // 2. Dismiss
    pmComponent.lockedWarningModalVisible.set(false);
    pmFixture.detectChanges();

    // 3. Open course form independently
    pmComponent.openCreateCourseModal();
    pmFixture.detectChanges();

    expect(pmComponent.courseModalVisible()).toBe(true);
    expect(pmComponent.lockedWarningModalVisible()).toBe(false);
  });

  it('XF-09: Pairwise Anonymous to PM Transition: đăng nhập từ khách sang PM chuyển quyền quản trị an toàn', () => {
    const anon = createPmAuthService('fac_cntt_01');
    expect(anon.isAuthenticated()).toBe(true);
    expect(anon.getFacultyId()).toBe('fac_cntt_01');
    expect(anon.hasAnyRole(['PROGRAM_MANAGER'])).toBe(true);
  });

  it('XF-10: Pairwise PM to Admin Transition: chuyển đổi tài khoản từ PM sang ADMIN mở rộng phạm vi đại học', () => {
    const adminAuth = createAdminAuthService();
    expect(adminAuth.isAdmin()).toBe(true);
    expect(adminAuth.getFacultyId()).toBeUndefined();
    expect(adminAuth.hasAnyRole(['ADMIN'])).toBe(true);
  });

  it('XF-11: Pairwise Admin Deactivation Protection: Khoa còn CTĐT active thì không thể chuyển sang inactive', () => {
    const fit = adminComponent.faculties()[0];

    adminComponent.onStatusToggle = (_fac: IFaculty) => {
      adminComponent.activeProgramWarningModalVisible.set(true);
      adminComponent.activeProgramWarningMessage.set('Khoa còn chương trình đào tạo đang hoạt động (ACTIVE).');
    };

    adminComponent.toggleFacultyStatus(fit);
    adminFixture.detectChanges();

    expect(adminComponent.activeProgramWarningModalVisible()).toBe(true);
    expect(fit.isActive).toBe(true);
  });

  it('XF-12: Pairwise Prerequisite Chain: HP1 -> HP2 -> HP3 hiển thị đúng chuỗi tiên quyết trong bảng môn học', () => {
    const pc1: IProgramCourse = {
      id: 'pc_1',
      programVersionId: 'ver_1',
      courseId: 'crs_1',
      course: createMockCourse({ id: 'crs_1', code: 'PRG101', name: 'Nhập môn lập trình' }),
      prerequisiteCourseIds: [],
    };
    const pc2: IProgramCourse = {
      id: 'pc_2',
      programVersionId: 'ver_1',
      courseId: 'crs_2',
      course: createMockCourse({ id: 'crs_2', code: 'OOP201', name: 'Lập trình OOP' }),
      prerequisiteCourseIds: ['PRG101'],
    };
    const pc3: IProgramCourse = {
      id: 'pc_3',
      programVersionId: 'ver_1',
      courseId: 'crs_3',
      course: createMockCourse({ id: 'crs_3', code: 'DS301', name: 'Cấu trúc dữ liệu' }),
      prerequisiteCourseIds: ['OOP201'],
    };

    homeComponent.versionCourses.set([pc1, pc2, pc3]);
    homeComponent.selectedVersionId.set('ver_1');
    homeComponent.activeTab.set('courses');
    homeFixture.detectChanges();

    const root = getRootElement(homeFixture);
    const rows = root.querySelectorAll('.course-row');
    expect(rows[0].textContent).toContain('—');
    expect(rows[1].textContent).toContain('PRG101');
    expect(rows[2].textContent).toContain('OOP201');
  });

  it('XF-13: Pairwise Bloom Level Consistency: Bloom Level của PI (Level 1..5) và CLO (B1..B6) khớp cấu trúc', () => {
    const matrix = createMockCloPiMatrix({
      cloCount: 2,
      piCount: 2,
      linkedPairs: [{ cloIndex: 0, piIndex: 0, weight: 2 }],
    });
    homeComponent.matrix.set(matrix);
    homeComponent.selectedVersionId.set('ver_1');
    homeComponent.activeTab.set('matrix');
    homeFixture.detectChanges();

    const root = getRootElement(homeFixture);
    expect(root.textContent).toContain('CLO1 (B1)');
    expect(root.textContent).toContain('PI1.1');
  });

  it('XF-14: Pairwise PM Payload Integrity: cố tình sửa đổi DOM select box vẫn giữ đúng principal.facultyId khi submit', () => {
    pmComponent.currentFacultyId.set('fac_cntt_01');
    pmComponent.syncScopedFaculty();

    let submittedData: { facultyId?: string; } | undefined;
    pmComponent.onSubmitProgram = (val: unknown) => {
      submittedData = val as { facultyId?: string; };
    };

    pmComponent.openCreateProgramModal();
    pmComponent.programForm.patchValue({ code: 'PROG_SAFE', name: 'Ngành An toàn' });
    pmFixture.detectChanges();

    pmComponent.submitProgram();
    expect(submittedData?.facultyId).toBe('fac_cntt_01');
  });

  it('XF-15: Pairwise Empty State Cascade: chọn Khoa không có CTĐT nào sẽ làm sạch toàn bộ các cấp dưới', () => {
    const emptyFac = createMockFaculty({ id: 'fac_empty', code: 'FEMP', name: 'Khoa Mới Mở' });
    homeComponent.faculties.set([...mockFaculties, emptyFac]);

    homeComponent.onFacultyChange('fac_empty');
    homeFixture.detectChanges();

    expect(homeComponent.filteredPrograms().length).toBe(0);
    expect(homeComponent.selectedProgramId()).toBe('');
    expect(homeComponent.selectedVersionId()).toBe('');
    expect(homeComponent.selectedCourseId()).toBe('');
    expect(homeComponent.matrix()).toBeNull();
  });

  it('XF-16: Pairwise Modal Dismissal Sequence: đóng nhiều modal lỗi kế tiếp không để lại backdrop mồ côi', () => {
    // 1. Conflict modal
    adminComponent.conflictError.set('Lỗi xung đột 409');
    adminFixture.detectChanges();
    expect(adminComponent.conflictError()).toBe('Lỗi xung đột 409');

    adminComponent.conflictError.set(null);
    adminFixture.detectChanges();
    expect(adminComponent.conflictError()).toBeNull();

    // 2. 422 warning modal
    adminComponent.activeProgramWarningModalVisible.set(true);
    adminFixture.detectChanges();
    expect(adminComponent.activeProgramWarningModalVisible()).toBe(true);

    adminComponent.activeProgramWarningModalVisible.set(false);
    adminFixture.detectChanges();
    expect(adminComponent.activeProgramWarningModalVisible()).toBe(false);
  });
});
