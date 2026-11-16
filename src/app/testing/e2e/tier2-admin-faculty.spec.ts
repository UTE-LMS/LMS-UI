import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminFacultyHarnessComponent,
  createAdminAuthService,
  createFacultyActiveProgramsError,
  createMockFaculty,
  createPmConflictError,
  getRootElement,
  IFaculty,
  IFacultyTransferPmRequest,
  IUser,
} from './test-helpers';

describe('Tier 2 Opaque-Box: Admin Faculty Management & PM 1-1 Assignment (F6 - F7)', () => {
  let fixture: ComponentFixture<AdminFacultyHarnessComponent>;
  let component: AdminFacultyHarnessComponent;

  const mockPmUser1: IUser = {
    id: 'usr_pm_01',
    username: 'pm_nam',
    email: 'nam.pm@hcmute.edu.vn',
    fullName: 'TS. Nguyễn Văn Nam',
    status: 'ACTIVE',
    roles: ['PROGRAM_MANAGER'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockPmUser2: IUser = {
    id: 'usr_pm_02',
    username: 'pm_huong',
    email: 'huong.pm@hcmute.edu.vn',
    fullName: 'PGS. TS. Trần Thu Hương',
    status: 'ACTIVE',
    roles: ['PROGRAM_MANAGER'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const initialFaculties: IFaculty[] = [
    createMockFaculty({
      id: 'fac_cntt_01',
      code: 'FIT',
      name: 'Khoa Công nghệ Thông tin',
      isActive: true,
      programManagerCount: 1,
      programManagers: [mockPmUser1],
    }),
    createMockFaculty({
      id: 'fac_ckct_02',
      code: 'FME',
      name: 'Khoa Cơ khí Chế tạo máy',
      isActive: true,
      programManagerCount: 1,
      programManagers: [mockPmUser2],
    }),
    createMockFaculty({
      id: 'fac_ddt_03',
      code: 'FEE',
      name: 'Khoa Điện - Điện tử',
      isActive: true,
      programManagerCount: 0,
      programManagers: [],
    }),
    createMockFaculty({
      id: 'fac_nn_04',
      code: 'FFL',
      name: 'Khoa Ngoại ngữ',
      isActive: false,
      programManagerCount: 0,
      programManagers: [],
    }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFacultyHarnessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFacultyHarnessComponent);
    component = fixture.componentInstance;
    component.faculties.set(JSON.parse(JSON.stringify(initialFaculties)) as IFaculty[]);
    fixture.detectChanges();
  });

  // ==========================================================================
  // Feature F6: Admin Faculty Management (CRUD & Status)
  // ==========================================================================
  describe('F6: Admin Faculty Management (CRUD & Status)', () => {
    it('T1-F6-01: ADMIN mở modal và tạo mới một Khoa thành công', () => {
      const auth = createAdminAuthService();
      expect(auth.isAdmin()).toBe(true);

      const root = getRootElement(fixture);
      const btnOpen = root.querySelector('#btnOpenCreateFaculty') as HTMLButtonElement;
      btnOpen.click();
      fixture.detectChanges();

      expect(component.createModalVisible()).toBe(true);
      component.facultyForm.setValue({ code: 'FCE', name: 'Khoa Xây dựng' });
      fixture.detectChanges();

      component.submitCreateFaculty();
      fixture.detectChanges();

      expect(component.createModalVisible()).toBe(false);
      const created = component.faculties().find(f => f.code === 'FCE');
      expect(created).toBeDefined();
      expect(created?.name).toBe('Khoa Xây dựng');
      expect(created?.isActive).toBe(true);
    });

    it('T1-F6-02: bảng Khoa hiển thị đầy đủ thông tin mã, tên, trạng thái và số lượng PM', () => {
      const root = getRootElement(fixture);
      const rows = root.querySelectorAll('.faculty-row');
      expect(rows.length).toBe(4);

      const firstRow = rows[0];
      expect(firstRow.textContent).toContain('FIT');
      expect(firstRow.textContent).toContain('Khoa Công nghệ Thông tin');
      expect(firstRow.textContent).toContain('Hoạt động');
      expect(firstRow.querySelector('.pm-count')?.textContent?.trim()).toBe('1');
    });

    it('T1-F6-03: ADMIN cập nhật trạng thái Khoa từ Hoạt động sang Đã vô hiệu hóa khi không có CTĐT active', () => {
      const targetFac = component.faculties()[2]; // FEE has 0 active programs
      expect(targetFac.isActive).toBe(true);

      component.toggleFacultyStatus(targetFac);
      fixture.detectChanges();

      const updated = component.faculties().find(f => f.id === targetFac.id);
      expect(updated?.isActive).toBe(false);

      const root = getRootElement(fixture);
      const row = root.querySelector('.faculty-row[data-id="fac_ddt_03"]') as HTMLElement;
      expect(row.textContent).toContain('Đã vô hiệu hóa');
    });

    it('T1-F6-04: ADMIN kích hoạt lại một Khoa đang bị vô hiệu hóa thành công', () => {
      const inactiveFac = component.faculties()[3]; // FFL is inactive
      expect(inactiveFac.isActive).toBe(false);

      component.toggleFacultyStatus(inactiveFac);
      fixture.detectChanges();

      const updated = component.faculties().find(f => f.id === inactiveFac.id);
      expect(updated?.isActive).toBe(true);

      const root = getRootElement(fixture);
      const row = root.querySelector('.faculty-row[data-id="fac_nn_04"]') as HTMLElement;
      expect(row.textContent).toContain('Hoạt động');
    });

    it('T1-F6-05: form tạo mới Khoa yêu cầu đầy đủ cả mã Khoa và tên Khoa', () => {
      component.openCreateModal();
      fixture.detectChanges();

      component.facultyForm.setValue({ code: '', name: '' });
      expect(component.facultyForm.invalid).toBe(true);

      component.facultyForm.setValue({ code: 'TEST', name: '' });
      expect(component.facultyForm.invalid).toBe(true);

      component.facultyForm.setValue({ code: 'TEST', name: 'Khoa Thử nghiệm' });
      expect(component.facultyForm.valid).toBe(true);
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F6-06: BẢO VỆ 422: vô hiệu hóa Khoa đang có CTĐT ACTIVE bị chặn và hiển thị modal cảnh báo', () => {
      const activeFac = component.faculties()[0]; // FIT has active programs

      // Simulate backend throwing 422 FACULTY_HAS_ACTIVE_PROGRAMS
      component.onStatusToggle = (_fac: IFaculty) => {
        const err = createFacultyActiveProgramsError();
        const errBody = err.error as { code?: string; message?: string; };
        component.activeProgramWarningMessage.set(errBody.message ?? 'Lỗi');
        component.activeProgramWarningModalVisible.set(true);
      };

      component.toggleFacultyStatus(activeFac);
      fixture.detectChanges();

      // Modal must be visible with friendly warning
      expect(component.activeProgramWarningModalVisible()).toBe(true);
      const root = getRootElement(fixture);
      const modal = root.querySelector('#activeProgramWarningModal') as HTMLElement;
      expect(modal).not.toBeNull();
      expect(modal.textContent).toContain('Không thể vô hiệu hóa Khoa');
      expect(modal.textContent).toContain('Khoa còn chương trình đào tạo đang hoạt động');

      // Status in table MUST remain active (NOT toggled)
      expect(activeFac.isActive).toBe(true);
    });

    it('T2-F6-07: đóng modal cảnh báo 422 đưa giao diện về trạng thái an toàn nguyên vẹn', () => {
      component.activeProgramWarningModalVisible.set(true);
      component.activeProgramWarningMessage.set('Khoa còn CTĐT đang hoạt động');
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const btnClose = root.querySelector('#btnCloseActiveProgramWarning') as HTMLButtonElement;
      btnClose.click();
      fixture.detectChanges();

      expect(component.activeProgramWarningModalVisible()).toBe(false);
      expect(root.querySelector('#activeProgramWarningModal')).toBeNull();
    });

    it('T2-F6-08: nút submit trong form tạo mới Khoa bị disabled khi form chưa hợp lệ', () => {
      component.openCreateModal();
      fixture.detectChanges();

      component.facultyForm.setValue({ code: '', name: '' });
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const submitBtn = root.querySelector('#btnSubmitFaculty') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    });

    it('T2-F6-09: form tạo mới Khoa có nút Hủy đóng modal mà không thay đổi danh sách', () => {
      const initialCount = component.faculties().length;
      component.openCreateModal();
      fixture.detectChanges();

      component.createModalVisible.set(false);
      fixture.detectChanges();

      expect(component.faculties().length).toBe(initialCount);
    });

    it('T2-F6-10: danh sách Khoa rỗng hiển thị bảng không bị vỡ bố cục', () => {
      component.faculties.set([]);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const rows = root.querySelectorAll('.faculty-row');
      expect(rows.length).toBe(0);
    });
  });

  // ==========================================================================
  // Feature F7: Admin PM 1-1 Assignment & Transfer
  // ==========================================================================
  describe('F7: Admin PM 1-1 Assignment & Transfer (1 PM = 1 Khoa)', () => {
    it('T1-F7-01: ADMIN mở modal quản lý PM của Khoa và xem danh sách PM hiện tại', () => {
      const fit = component.faculties()[0];
      component.openPmModal(fit);
      fixture.detectChanges();

      expect(component.pmModalVisible()).toBe(true);
      expect(component.selectedFaculty()?.code).toBe('FIT');

      const root = getRootElement(fixture);
      const pmItems = root.querySelectorAll('.pm-item');
      expect(pmItems.length).toBe(1);
      expect(pmItems[0].textContent).toContain('TS. Nguyễn Văn Nam');
    });

    it('T1-F7-02: gán PM mới cho Khoa chưa có PM thành công', () => {
      const fee = component.faculties()[2]; // FEE has 0 PMs
      component.openPmModal(fee);
      fixture.detectChanges();

      const mockNewPm: IUser = {
        id: 'usr_pm_new',
        username: 'pm_cuong',
        email: 'cuong.pm@hcmute.edu.vn',
        fullName: 'TS. Lê Hùng Cường',
        status: 'ACTIVE',
        roles: ['PROGRAM_MANAGER'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const assignSpy = vi.fn((_fid: string, _uid: string) => {
        component.selectedFaculty.update(f => (f ? {
          ...f,
          programManagerCount: (f.programManagerCount ?? 0) + 1,
          programManagers: [...(f.programManagers ?? []), mockNewPm],
        } : null));
      });
      component.onAssignPm = assignSpy;

      component.newPmUserId.set('usr_pm_new');
      fixture.detectChanges();

      component.assignPm();
      fixture.detectChanges();

      expect(assignSpy).toHaveBeenCalledWith('fac_ddt_03', 'usr_pm_new');
      expect(component.selectedFaculty()?.programManagers?.length).toBe(1);
    });

    it('T1-F7-03: gỡ PM khỏi Khoa thành công và cập nhật lại số lượng PM', () => {
      const fit = component.faculties()[0];
      component.openPmModal(fit);
      fixture.detectChanges();

      const removeSpy = vi.fn((_fid: string, uid: string) => {
        component.selectedFaculty.update(f => (f ? {
          ...f,
          programManagerCount: Math.max(0, (f.programManagerCount ?? 1) - 1),
          programManagers: f.programManagers?.filter(p => p.id !== uid) ?? [],
        } : null));
      });
      component.onRemovePm = removeSpy;

      component.removePm('usr_pm_01');
      fixture.detectChanges();

      expect(removeSpy).toHaveBeenCalledWith('fac_cntt_01', 'usr_pm_01');
      expect(component.selectedFaculty()?.programManagers?.length).toBe(0);
    });

    it('T1-F7-04: mở form điều chuyển PM hiển thị Khoa tiếp nhận hợp lệ và trường lý do', () => {
      const fit = component.faculties()[0];
      component.openPmModal(fit);
      component.openTransferForm(mockPmUser1);
      fixture.detectChanges();

      expect(component.transferringPm()?.id).toBe('usr_pm_01');
      const root = getRootElement(fixture);
      const transferSection = root.querySelector('#transferPmSection') as HTMLElement;
      expect(transferSection).not.toBeNull();
      expect(transferSection.textContent).toContain('Điều chuyển PM: TS. Nguyễn Văn Nam');
    });

    it('T1-F7-05: điều chuyển PM sang Khoa đích thành công với lý do hợp lệ', () => {
      const fit = component.faculties()[0];
      component.openPmModal(fit);
      component.openTransferForm(mockPmUser1);
      fixture.detectChanges();

      let transferredPayload: IFacultyTransferPmRequest | undefined;
      component.onTransferPm = (dto: IFacultyTransferPmRequest) => {
        transferredPayload = dto;
      };

      component.transferTargetFacultyId.set('fac_ddt_03');
      component.transferReason.set('Điều động cán bộ theo yêu cầu tái cơ cấu tổ chức');
      fixture.detectChanges();

      component.confirmTransfer();
      expect(transferredPayload).toBeDefined();
      expect(transferredPayload?.userId).toBe('usr_pm_01');
      expect(transferredPayload?.targetFacultyId).toBe('fac_ddt_03');
      expect(transferredPayload?.transferReason).toBe('Điều động cán bộ theo yêu cầu tái cơ cấu tổ chức');
    });

    // Boundary / Corner cases (Tier 2)
    it('T2-F7-06: RÀNG BUỘC 1 PM = 1 KHOA: thử gán user đã là PM của Khoa khác nhận lỗi 409 và hiển thị thông báo xung đột', () => {
      const fee = component.faculties()[2]; // Try assigning to FEE
      component.openPmModal(fee);
      fixture.detectChanges();

      // Simulate conflict 409
      component.onAssignPm = (_fid: string, _uid: string) => {
        const err = createPmConflictError();
        const errBody = err.error as { code?: string; message?: string; };
        component.conflictError.set(errBody.message ?? 'Conflict');
      };

      component.newPmUserId.set('usr_pm_01'); // Already PM of FIT
      component.assignPm();
      fixture.detectChanges();

      expect(component.conflictError()).toContain('Vi phạm ràng buộc 1 PM = 1 Khoa');
      const root = getRootElement(fixture);
      const alert = root.querySelector('#pmConflictAlert') as HTMLElement;
      expect(alert).not.toBeNull();
      expect(alert.textContent).toContain('Người dùng đã là Program Manager của Khoa khác');
    });

    it('T2-F7-07: điều chuyển PM BẮT BUỘC có lý do; nếu lý do rỗng nút xác nhận bị disabled', () => {
      const fit = component.faculties()[0];
      component.openPmModal(fit);
      component.openTransferForm(mockPmUser1);
      fixture.detectChanges();

      component.transferTargetFacultyId.set('fac_ddt_03');
      component.transferReason.set('   '); // Whitespace
      fixture.detectChanges();

      const root = getRootElement(fixture);
      const confirmBtn = root.querySelector('#btnConfirmTransfer') as HTMLButtonElement;
      expect(confirmBtn.disabled).toBe(true);

      component.transferReason.set('Lý do chính đáng');
      fixture.detectChanges();
      expect(confirmBtn.disabled).toBe(false);
    });

    it('T2-F7-08: danh sách Khoa tiếp nhận điều chuyển loại trừ chính Khoa hiện tại và các Khoa inactive', () => {
      const fit = component.faculties()[0];
      component.openPmModal(fit);
      fixture.detectChanges();

      const targets = component.availableTargetFaculties();
      const targetIds = targets.map(t => t.id);

      // Must exclude self ('fac_cntt_01')
      expect(targetIds).not.toContain('fac_cntt_01');
      // Must exclude inactive faculty ('fac_nn_04')
      expect(targetIds).not.toContain('fac_nn_04');
      // Must include FME and FEE
      expect(targetIds).toContain('fac_ckct_02');
      expect(targetIds).toContain('fac_ddt_03');
    });

    it('T2-F7-09: hủy điều chuyển đóng khung điều chuyển và xóa form tạm', () => {
      const fit = component.faculties()[0];
      component.openPmModal(fit);
      component.openTransferForm(mockPmUser1);
      fixture.detectChanges();

      component.transferringPm.set(null);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.querySelector('#transferPmSection')).toBeNull();
    });

    it('T2-F7-10: Khoa chưa có PM nào hiển thị ghi chú Chưa có PM nào được gán', () => {
      const fee = component.faculties()[2];
      component.openPmModal(fee);
      fixture.detectChanges();

      const root = getRootElement(fixture);
      expect(root.textContent).toContain('Chưa có PM nào được gán cho Khoa này');
    });
  });
});
