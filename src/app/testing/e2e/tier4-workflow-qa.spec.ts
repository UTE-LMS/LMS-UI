import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminFacultyHarnessComponent,
  createAdminAuthService,
  createCourseLockedError,
  createFacultyActiveProgramsError,
  createMockCloPiMatrix,
  createMockCourse,
  createMockFaculty,
  createMockPi,
  createMockPlo,
  createMockProgram,
  createMockProgramVersion,
  createPmAuthService,
  createPmConflictError,
  createQaAuthService,
  getRootElement,
  IFaculty,
  IFacultyTransferPmRequest,
  IProgramCourse,
  IUser,
  PmScopingHarnessComponent,
  PublicHomepageHarnessComponent,
  WorkflowQaHarnessComponent,
} from './test-helpers';

describe('Tier 4 Opaque-Box: Workflow, QA Read-Only & Real-World Application Scenarios (F10 - F12, S1 - S8)', () => {
  let fixture: ComponentFixture<WorkflowQaHarnessComponent>;
  let component: WorkflowQaHarnessComponent;

  const mockEntities = [
    {
      id: 'ent_draft_01',
      title: 'Đề cương Môn học Nháp (Tạo thủ công)',
      version: '2026-v0',
      status: 'DRAFT',
      verificationStatus: 'UNVERIFIED',
      isImported: false,
    },
    {
      id: 'ent_imported_02',
      title: 'Đề cương Môn học Đã Import CSV',
      version: '2026-v1',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isImported: true,
    },
    {
      id: 'ent_archived_03',
      title: 'Đề cương Môn học Đã Khóa Lưu Trữ',
      version: '2024-v1',
      status: 'ARCHIVED',
      verificationStatus: 'VERIFIED',
      isImported: true,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        WorkflowQaHarnessComponent,
        PublicHomepageHarnessComponent,
        AdminFacultyHarnessComponent,
        PmScopingHarnessComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowQaHarnessComponent);
    component = fixture.componentInstance;
    component.entities.set(JSON.parse(JSON.stringify(mockEntities)) as typeof mockEntities);
    fixture.detectChanges();
  });

  // ==========================================================================
  // Feature F10: CSV Preview & Auto-VERIFIED Import
  // ==========================================================================
  describe('F10: CSV Preview & Auto-VERIFIED Import (2 bước)', () => {
    it('T1-F10-01: PM mở modal import CSV và tải lên tệp đề cương thành công', () => {
      component.currentRole.set('PROGRAM_MANAGER');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const btnOpen = root.querySelector('#btnOpenImportCsv') as HTMLButtonElement;
      btnOpen.click();
      fixture.detectChanges();

      expect(component.importModalVisible()).toBe(true);
      expect(component.importStep()).toBe(1);

      // Simulate file select
      const mockFile = new File(['code,content,bloom\nCLO1,Noi dung 1,3'], 'de_cuong.csv', { type: 'text/csv' });
      component.selectedFile.set(mockFile);
      fixture.detectChanges();

      const btnPreview = root.querySelector('#btnPreviewCsv') as HTMLButtonElement;
      expect(btnPreview.disabled).toBe(false);
    });

    it('T1-F10-02: bước 1 gọi preview và chuyển sang bước 2 hiển thị bảng dữ liệu xem trước', () => {
      component.importModalVisible.set(true);
      component.selectedFile.set(new File(['dummy'], 'test.csv'));
      component.previewCsv();
      fixture.detectChanges();

      expect(component.importStep()).toBe(2);
      expect(component.previewData().length).toBe(3);

      const root = getRootElement(fixture);
      const previewTable = root.querySelector('#csvPreviewTable') as HTMLTableElement;
      expect(previewTable).not.toBeNull();
      const rows = previewTable.querySelectorAll('.preview-row');
      expect(rows.length).toBe(3);
      expect(rows[0].textContent).toContain('CLO1');
      expect(rows[0].textContent).toContain('Vận dụng tư duy hướng đối tượng');
      expect(rows[0].textContent).toContain('Level 3');
    });

    it('T1-F10-03: bước 2 hiển thị huy hiệu xác nhận trạng thái sẽ là Auto-VERIFIED', () => {
      component.importModalVisible.set(true);
      component.selectedFile.set(new File(['dummy'], 'test.csv'));
      component.previewCsv();
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const step2 = root.querySelector('#importStep2') as HTMLElement;
      expect(step2.textContent).toContain('Auto-VERIFIED');
    });

    it('T1-F10-04: PM nhấn Xác nhận Import lưu dữ liệu với trạng thái ACTIVE và VERIFIED ngay lập tức', () => {
      component.importModalVisible.set(true);
      component.selectedFile.set(new File(['dummy'], 'test.csv'));
      component.previewCsv();
      fixture.detectChanges();

      component.confirmImport();
      fixture.detectChanges();

      expect(component.importModalVisible()).toBe(false);
      const created = component.entities().find(e => e.id.startsWith('syl_imported_'));
      expect(created).toBeDefined();
      expect(created?.status).toBe('ACTIVE');
      expect(created?.verificationStatus).toBe('VERIFIED');
      expect(created?.isImported).toBe(true);
    });

    it('T1-F10-05: từ bước 2 có thể nhấn Quay lại để trở về bước 1 chọn tệp khác', () => {
      component.importModalVisible.set(true);
      component.selectedFile.set(new File(['dummy'], 'test.csv'));
      component.previewCsv();
      fixture.detectChanges();

      expect(component.importStep()).toBe(2);

      const root = getRootElement(fixture);
      const backBtn = root.querySelector('#importStep2 button') as HTMLButtonElement;
      backBtn.click();
      fixture.detectChanges();

      expect(component.importStep()).toBe(1);
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F10-06: chưa chọn tệp CSV thì nút Xem trước dữ liệu bị disabled', () => {
      component.importModalVisible.set(true);
      component.selectedFile.set(null);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const btnPreview = root.querySelector('#btnPreviewCsv') as HTMLButtonElement;
      expect(btnPreview.disabled).toBe(true);
    });

    it('T2-F10-07: bảng xem trước hiển thị đúng ký tự tiếng Việt có dấu và ký tự đặc biệt', () => {
      component.importModalVisible.set(true);
      component.previewData.set([
        { code: 'CLO_VN', content: 'Khả năng phân tích & thiết kế: ĐBCL, chuẩn HCMUTE', bloomLevel: 4 },
      ]);
      component.importStep.set(2);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.textContent).toContain('Khả năng phân tích & thiết kế: ĐBCL, chuẩn HCMUTE');
    });

    it('T2-F10-08: đóng modal import sẽ reset trạng thái bước về 1', () => {
      component.importModalVisible.set(true);
      component.importStep.set(2);
      fixture.detectChanges();

      component.importModalVisible.set(false);
      component.importStep.set(1);
      fixture.detectChanges();

      expect(component.importStep()).toBe(1);
    });

    it('T2-F10-09: entity sau khi import có cờ isImported=true', () => {
      component.confirmImport();
      const last = component.entities()[component.entities().length - 1];
      expect(last.isImported).toBe(true);
    });

    it('T2-F10-10: callback onConfirmImportAction được kích hoạt với đầy đủ dữ liệu xem trước', () => {
      let capturedData: unknown;
      component.onConfirmImportAction = (data: unknown) => {
        capturedData = data;
      };

      component.previewCsv();
      component.confirmImport();

      expect(capturedData).toBeDefined();
    });
  });

  // ==========================================================================
  // Feature F11: Lock-only Action Button (PUT .../lock -> ARCHIVED)
  // ==========================================================================
  describe('F11: Lock-only Action Button', () => {
    it('T1-F11-01: thực thể ở trạng thái ACTIVE hoặc DRAFT hiển thị nút Khóa (Lock)', () => {
      component.currentRole.set('PROGRAM_MANAGER');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const activeCard = root.querySelector('.entity-card[data-id="ent_imported_02"]') as HTMLElement;
      expect(activeCard).not.toBeNull();
      const lockBtn = activeCard.querySelector('.btn-lock-entity') as HTMLButtonElement;
      expect(lockBtn).not.toBeNull();
      expect(lockBtn.textContent?.trim()).toBe('Khóa (Lock)');
    });

    it('T1-F11-02: bấm nút Khóa kích hoạt hàm khóa và chuyển trạng thái trực tiếp sang ARCHIVED', () => {
      const activeItem = component.entities()[1];
      expect(activeItem.status).toBe('ACTIVE');

      component.lockEntity(activeItem);
      fixture.detectChanges();

      const updated = component.entities().find(e => e.id === activeItem.id);
      expect(updated?.status).toBe('ARCHIVED');
    });

    it('T1-F11-03: sau khi chuyển sang ARCHIVED, badge trạng thái cập nhật hiển thị ARCHIVED', () => {
      const activeItem = component.entities()[1];
      component.lockEntity(activeItem);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const card = root.querySelector('.entity-card[data-id="ent_imported_02"]') as HTMLElement;
      const badge = card.querySelector('.status-badge') as HTMLElement;
      expect(badge.textContent).toContain('ARCHIVED');
    });

    it('T1-F11-04: thực thể đã ở trạng thái ARCHIVED hoàn toàn không hiển thị nút Khóa nữa', () => {
      const root = getRootElement(fixture);
      const archivedCard = root.querySelector('.entity-card[data-id="ent_archived_03"]') as HTMLElement;
      expect(archivedCard.querySelector('.btn-lock-entity')).toBeNull();
    });

    it('T1-F11-05: callback onLockAction được kích hoạt đúng entityId khi bấm nút Khóa', () => {
      const lockSpy = vi.fn();
      component.onLockAction = lockSpy;

      const item = component.entities()[0];
      component.lockEntity(item);

      expect(lockSpy).toHaveBeenCalledWith('ent_draft_01');
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F11-06: thực thể ARCHIVED không cho phép sửa hay xóa', () => {
      const root = getRootElement(fixture);
      const archivedCard = root.querySelector('.entity-card[data-id="ent_archived_03"]') as HTMLElement;
      expect(archivedCard.querySelector('.btn-edit-entity')).toBeNull();
      expect(archivedCard.querySelector('.btn-delete-entity')).toBeNull();
    });

    it('T2-F11-07: khóa thực thể bảo toàn thông tin mã, tên và phiên bản không bị biến đổi', () => {
      const item = component.entities()[1];
      const initialTitle = item.title;
      const initialVer = item.version;

      component.lockEntity(item);
      const updated = component.entities().find(e => e.id === item.id);

      expect(updated?.title).toBe(initialTitle);
      expect(updated?.version).toBe(initialVer);
    });

    it('T2-F11-08: nút Khóa không xuất hiện nếu người dùng có vai trò QA', () => {
      component.currentRole.set('QA');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const lockBtns = root.querySelectorAll('.btn-lock-entity');
      expect(lockBtns.length).toBe(0);
    });

    it('T2-F11-09: khóa liên tiếp nhiều thực thể cập nhật trạng thái độc lập từng thực thể', () => {
      component.lockEntity(component.entities()[0]);
      component.lockEntity(component.entities()[1]);

      expect(component.entities()[0].status).toBe('ARCHIVED');
      expect(component.entities()[1].status).toBe('ARCHIVED');
    });

    it('T2-F11-10: danh sách thực thể rỗng không làm vỡ giao diện nút Khóa', () => {
      component.entities.set([]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.querySelectorAll('.entity-card').length).toBe(0);
    });
  });

  // ==========================================================================
  // Feature F12: QA Read-Only Enforcement & Post-Import Immutability
  // ==========================================================================
  describe('F12: QA Read-Only Enforcement & Post-Import Immutability', () => {
    it('T1-F12-01: BẤT BIẾN POST-IMPORT: thực thể đã import CSV (isImported=true) KHÔNG có nút Sửa và nút Xóa', () => {
      component.currentRole.set('PROGRAM_MANAGER');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const importedCard = root.querySelector('.entity-card[data-id="ent_imported_02"]') as HTMLElement;
      expect(importedCard).not.toBeNull();
      expect(importedCard.querySelector('.btn-edit-entity')).toBeNull();
      expect(importedCard.querySelector('.btn-delete-entity')).toBeNull();
    });

    it('T1-F12-02: thực thể tạo nháp thủ công (isImported=false) vẫn có nút Sửa và nút Xóa cho PM', () => {
      component.currentRole.set('PROGRAM_MANAGER');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const draftCard = root.querySelector('.entity-card[data-id="ent_draft_01"]') as HTMLElement;
      expect(draftCard).not.toBeNull();
      expect(draftCard.querySelector('.btn-edit-entity')).not.toBeNull();
      expect(draftCard.querySelector('.btn-delete-entity')).not.toBeNull();
    });

    it('T1-F12-03: PHÂN QUYỀN QA READ-ONLY: vai trò QA không hiển thị bất kỳ nút Sửa, Xóa, Duyệt (Approve), Verify nào', () => {
      component.currentRole.set('QA');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.querySelector('.btn-edit-entity')).toBeNull();
      expect(root.querySelector('.btn-delete-entity')).toBeNull();
      expect(root.querySelector('.btn-approve-entity')).toBeNull();
      expect(root.querySelector('.btn-verify-entity')).toBeNull();
      expect(root.querySelector('#btnOpenImportCsv')).toBeNull();
    });

    it('T1-F12-04: vai trò QA có nút Xuất báo cáo ĐBCL (#btnExportReport)', () => {
      component.currentRole.set('QA');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const exportBtn = root.querySelector('#btnExportReport') as HTMLButtonElement;
      expect(exportBtn).not.toBeNull();
      expect(exportBtn.textContent).toContain('Xuất báo cáo ĐBCL');
    });

    it('T1-F12-05: vai trò QA hiển thị nhãn thông báo Chế độ kiểm tra ĐBCL: Chỉ đọc', () => {
      component.currentRole.set('QA');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.textContent).toContain('Chế độ kiểm tra ĐBCL: Chỉ đọc (Read-only)');
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F12-06: mock AuthService cho QA trả về isQA()=true và không có quyền ADMIN', () => {
      const qaAuth = createQaAuthService();
      expect(qaAuth.isQA()).toBe(true);
      expect(qaAuth.isAdmin()).toBe(false);
      expect(qaAuth.isProgramManager()).toBe(false);
    });

    it('T2-F12-07: gọi hàm onExportReport với QA thực thi an toàn', () => {
      component.currentRole.set('QA');
      const res = component.onExportReport();
      expect(res).toBe(true);
    });

    it('T2-F12-08: chuyển đổi role qua lại giữa PM và QA cập nhật đúng trạng thái nút trong DOM', () => {
      // 1. As PM
      component.currentRole.set('PROGRAM_MANAGER');
      fixture.detectChanges();
      let root = getRootElement(fixture);
      expect(root.querySelector('#btnOpenImportCsv')).not.toBeNull();
      expect(root.querySelector('#btnExportReport')).toBeNull();

      // 2. Switch to QA
      component.currentRole.set('QA');
      fixture.detectChanges();
      root = getRootElement(fixture);
      expect(root.querySelector('#btnOpenImportCsv')).toBeNull();
      expect(root.querySelector('#btnExportReport')).not.toBeNull();
    });

    it('T2-F12-09: tính bất biến sau import áp dụng đồng thời khi có nhiều thực thể', () => {
      const manyEntities = [
        { id: '1', title: 'Ver 1', version: '1', status: 'ACTIVE', verificationStatus: 'VERIFIED', isImported: true },
        { id: '2', title: 'Ver 2', version: '2', status: 'ACTIVE', verificationStatus: 'VERIFIED', isImported: true },
        { id: '3', title: 'Ver 3', version: '3', status: 'ACTIVE', verificationStatus: 'VERIFIED', isImported: true },
      ];
      component.entities.set(manyEntities);
      component.currentRole.set('PROGRAM_MANAGER');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.querySelectorAll('.btn-edit-entity').length).toBe(0);
      expect(root.querySelectorAll('.btn-delete-entity').length).toBe(0);
    });

    it('T2-F12-10: phương thức onEditEntity và onDeleteEntity trả về đối tượng an toàn', () => {
      expect(component.onEditEntity('test')).toBe('test');
      expect(component.onDeleteEntity('test')).toBe('test');
    });
  });

  // ==========================================================================
  // Real-World Application Scenarios (S1 through S8)
  // ==========================================================================
  describe('Real-World Application Scenarios S1 - S8', () => {
    it('S1: Prospective Student Public Exploration: khách tra cứu Khoa CNTT -> Kỹ thuật PM -> Khóa 2024 -> Xem PLO/PI -> Môn học -> Ma trận Q22', () => {
      const homeFix = TestBed.createComponent(PublicHomepageHarnessComponent);
      const home = homeFix.componentInstance;

      const fit = createMockFaculty({ id: 'fac_fit', code: 'FIT', name: 'Khoa Công nghệ Thông tin' });
      const se = createMockProgram({ id: 'prog_se', facultyId: 'fac_fit', code: '7480103', name: 'Kỹ thuật Phần mềm' });
      const ver2024 = createMockProgramVersion({ id: 'ver_2024', programId: 'prog_se', version: '2024-v1', applicableCohort: '2024' });
      const pcOop: IProgramCourse = {
        id: 'pc_oop',
        programVersionId: 'ver_2024',
        courseId: 'crs_oop',
        course: createMockCourse({ id: 'crs_oop', code: 'OOP101', name: 'Lập trình OOP', credits: 3 }),
        semester: 2,
        credits: 3,
      };
      const plo1 = createMockPlo({ id: 'plo_1', programVersionId: 'ver_2024', code: 'PLO1' });
      const pi1 = createMockPi({ id: 'pi_1', programVersionId: 'ver_2024', ploId: 'plo_1', code: 'PI1.1' });
      const matrix = createMockCloPiMatrix({
        cloCount: 2,
        piCount: 2,
        linkedPairs: [{ cloIndex: 0, piIndex: 0, weight: 2 }],
      });

      home.faculties.set([fit]);
      home.programs.set([se]);
      home.versions.set([ver2024]);
      home.versionCourses.set([pcOop]);
      home.plos.set([plo1]);
      home.pis.set([pi1]);
      home.matrix.set(matrix);

      // Tra cứu liên hoàn
      home.onFacultyChange('fac_fit');
      home.onProgramChange('prog_se');
      home.onVersionChange('ver_2024');
      home.matrix.set(matrix);
      homeFix.detectChanges();

      // Kiểm tra Tab 1 PLO/PI
      home.activeTab.set('plo-pi');
      homeFix.detectChanges();
      let root = getRootElement(homeFix);
      expect(root.textContent).toContain('PLO1');
      expect(root.textContent).toContain('PI1.1');

      // Kiểm tra Tab 2 Môn học
      home.activeTab.set('courses');
      homeFix.detectChanges();
      root = getRootElement(homeFix);
      expect(root.textContent).toContain('OOP101');
      expect(root.textContent).toContain('Lập trình OOP');

      // Kiểm tra Tab 3 Ma trận CLO-PI tuân thủ Q22
      home.activeTab.set('matrix');
      homeFix.detectChanges();
      root = getRootElement(homeFix);
      const unlinkedCell = root.querySelector('td.matrix-cell[data-clo="clo_1"][data-pi="pi_2"]') as HTMLElement;
      expect(unlinkedCell.textContent?.trim()).toBe('—');
      expect(unlinkedCell.textContent?.trim()).not.toBe('0');
    });

    it('S2: University Admin Faculty Setup & PM Assignment: tạo Khoa Ngoại ngữ, gán PM1, thử gán sang Khoa thứ 2 (bị 409), điều chuyển với lý do', () => {
      const adminFix = TestBed.createComponent(AdminFacultyHarnessComponent);
      const admin = adminFix.componentInstance;

      const ffl = createMockFaculty({ id: 'fac_ffl', code: 'FFL', name: 'Khoa Ngoại ngữ', programManagers: [] });
      const fdl = createMockFaculty({ id: 'fac_fdl', code: 'FDL', name: 'Khoa Du lịch', programManagers: [] });
      admin.faculties.set([ffl, fdl]);
      adminFix.detectChanges();

      const pm1: IUser = {
        id: 'usr_pm_1',
        username: 'pm_thanh',
        email: 'thanh@hcmute.edu.vn',
        fullName: 'TS. Nguyễn Văn Thành',
        status: 'ACTIVE',
        roles: ['PROGRAM_MANAGER'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      // 1. Gán PM1 cho FFL
      admin.openPmModal(ffl);
      admin.selectedFaculty.update(f => (f ? { ...f, programManagers: [pm1], programManagerCount: 1 } : null));
      adminFix.detectChanges();
      expect(admin.selectedFaculty()?.programManagers?.length).toBe(1);

      // 2. Thử gán PM1 cho FDL -> nhận lỗi 409
      admin.openPmModal(fdl);
      admin.onAssignPm = () => {
        const err = createPmConflictError();
        const errBody = err.error as { message?: string; };
        admin.conflictError.set(errBody.message ?? 'Conflict');
      };
      admin.newPmUserId.set('usr_pm_1');
      admin.assignPm();
      adminFix.detectChanges();

      expect(admin.conflictError()).toContain('Vi phạm ràng buộc 1 PM = 1 Khoa');

      // 3. Thực hiện điều chuyển PM1 từ FFL sang FDL kèm lý do
      admin.openPmModal(ffl);
      admin.openTransferForm(pm1);
      admin.transferTargetFacultyId.set('fac_fdl');
      admin.transferReason.set('Tăng cường cán bộ cho Khoa Du lịch');

      let transferSuccess = false;
      admin.onTransferPm = (dto: IFacultyTransferPmRequest) => {
        if (dto.targetFacultyId === 'fac_fdl' && dto.transferReason.trim()) {
          transferSuccess = true;
        }
      };
      admin.confirmTransfer();
      expect(transferSuccess).toBe(true);
    });

    it('S3: PM Curricular Management & 422 Locked Protection: PM Cơ khí tạo CTĐT (Khoa bị khóa), sửa môn có phiên bản ACTIVE nhận cảnh báo 422', () => {
      const pmFix = TestBed.createComponent(PmScopingHarnessComponent);
      const pm = pmFix.componentInstance;

      // PM belongs to FME
      pm.currentFacultyId.set('fac_ckct_02');
      pm.currentFacultyName.set('Khoa Cơ khí Chế tạo máy');
      pm.syncScopedFaculty();
      pm.openCreateProgramModal();
      pmFix.detectChanges();

      // Form faculty locked to FME
      expect(pm.programForm.get('facultyId')?.value).toBe('fac_ckct_02');
      expect(pm.programForm.get('facultyId')?.disabled).toBe(true);

      // Sửa môn học bị 422
      const err = createCourseLockedError('Học phần đã có phiên bản CTĐT ban hành (ACTIVE/ARCHIVED). Không được chỉnh sửa.');
      pm.handleLockedError(err);
      pmFix.detectChanges();

      expect(pm.lockedWarningModalVisible()).toBe(true);
      expect(pm.lockedWarningMessage()).toContain('Học phần đã có phiên bản CTĐT ban hành');
    });

    it('S4: 2-Step Curriculum CSV Import & Direct Publish: PM tải CSV -> Preview -> Xác nhận -> Auto-VERIFIED trực tiếp', () => {
      component.currentRole.set('PROGRAM_MANAGER');
      fixture.detectChanges();

      // Step 1: Upload & Preview
      component.selectedFile.set(new File(['code,content,bloom'], 'syllabus.csv'));
      component.previewCsv();
      fixture.detectChanges();

      expect(component.importStep()).toBe(2);
      expect(component.previewData().length).toBeGreaterThan(0);

      // Step 2: Confirm import
      component.confirmImport();
      fixture.detectChanges();

      const newEnt = component.entities().find(e => e.id.startsWith('syl_imported_'));
      expect(newEnt).toBeDefined();
      expect(newEnt?.status).toBe('ACTIVE');
      expect(newEnt?.verificationStatus).toBe('VERIFIED');
    });

    it('S5: Program Lifecycle Lock to ARCHIVED: PM bấm nút Khóa -> chuyển sang ARCHIVED -> ẩn các nút Sửa/Xóa', () => {
      component.currentRole.set('PROGRAM_MANAGER');
      fixture.detectChanges();

      const target = component.entities()[1]; // ACTIVE imported entity
      component.lockEntity(target);
      fixture.detectChanges();

      const updated = component.entities().find(e => e.id === target.id);
      expect(updated?.status).toBe('ARCHIVED');
      const root = getRootElement(fixture);
      const card = root.querySelector('.entity-card[data-id="ent_imported_02"]') as HTMLElement;
      expect(card.querySelector('.btn-lock-entity')).toBeNull();
      expect(card.querySelector('.btn-edit-entity')).toBeNull();
      expect(card.querySelector('.btn-delete-entity')).toBeNull();
    });

    it('S6: QA Auditor Compliance & Read-Only Inspection: cán bộ QA kiểm tra đề cương, mọi nút Thêm/Sửa/Xóa/Duyệt bị loại bỏ hoàn toàn', () => {
      component.currentRole.set('QA');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.querySelector('#btnOpenImportCsv')).toBeNull();
      expect(root.querySelectorAll('.btn-edit-entity').length).toBe(0);
      expect(root.querySelectorAll('.btn-delete-entity').length).toBe(0);
      expect(root.querySelectorAll('.btn-lock-entity').length).toBe(0);

      // Only export report is available
      expect(root.querySelector('#btnExportReport')).not.toBeNull();
      expect(root.textContent).toContain('Chế độ kiểm tra ĐBCL: Chỉ đọc (Read-only)');
    });

    it('S7: Concurrent Active Program Faculty Deactivation Protection: Admin tắt trạng thái Khoa có CTĐT ACTIVE nhận lỗi 422', () => {
      const adminFix = TestBed.createComponent(AdminFacultyHarnessComponent);
      const admin = adminFix.componentInstance;

      const fit = createMockFaculty({ id: 'fac_fit', code: 'FIT', name: 'Khoa CNTT', isActive: true });
      admin.faculties.set([fit]);
      adminFix.detectChanges();

      admin.onStatusToggle = (_fac: IFaculty) => {
        const err = createFacultyActiveProgramsError();
        const errBody = err.error as { message?: string; };
        admin.activeProgramWarningMessage.set(errBody.message ?? 'Active programs');
        admin.activeProgramWarningModalVisible.set(true);
      };

      admin.toggleFacultyStatus(fit);
      adminFix.detectChanges();

      expect(admin.activeProgramWarningModalVisible()).toBe(true);
      expect(admin.activeProgramWarningMessage()).toContain('Khoa còn chương trình đào tạo đang hoạt động');
      expect(fit.isActive).toBe(true);
    });

    it('S8: Cross-Role End-to-End Governance Cycle: toàn bộ chu trình ADMIN -> PM -> QA -> Khách vãng lai với Invariant Q22', () => {
      // 1. ADMIN tạo Khoa và gán PM
      const adminAuth = createAdminAuthService();
      expect(adminAuth.isAdmin()).toBe(true);

      // 2. PM đăng nhập import CTĐT
      const pmAuth = createPmAuthService('fac_cntt_01');
      expect(pmAuth.isProgramManager()).toBe(true);

      component.currentRole.set('PROGRAM_MANAGER');
      component.selectedFile.set(new File(['dummy'], 'syllabus.csv'));
      component.previewCsv();
      component.confirmImport();
      const imported = component.entities()[component.entities().length - 1];
      expect(imported.status).toBe('ACTIVE');
      expect(imported.verificationStatus).toBe('VERIFIED');

      // 3. Khóa sang ARCHIVED
      component.lockEntity(imported);
      const locked = component.entities().find(e => e.id === imported.id);
      expect(locked?.status).toBe('ARCHIVED');

      // 4. QA đăng nhập kiểm tra chỉ đọc
      const qaAuth = createQaAuthService();
      expect(qaAuth.isQA()).toBe(true);

      // 5. Khách vãng lai xem công khai với Invariant Q22
      const homeFix = TestBed.createComponent(PublicHomepageHarnessComponent);
      const home = homeFix.componentInstance;
      const matrix = createMockCloPiMatrix({
        cloCount: 2,
        piCount: 2,
        linkedPairs: [{ cloIndex: 0, piIndex: 0, weight: 3 }],
      });
      home.matrix.set(matrix);
      home.selectedVersionId.set('ver_se');
      home.activeTab.set('matrix');
      homeFix.detectChanges();

      const root = getRootElement(homeFix);
      const unlinkedCell = root.querySelector('td.matrix-cell[data-clo="clo_1"][data-pi="pi_2"]') as HTMLElement;
      expect(unlinkedCell.textContent?.trim()).toBe('—');
      expect(unlinkedCell.textContent?.trim()).not.toBe('0');
    });
  });
});
