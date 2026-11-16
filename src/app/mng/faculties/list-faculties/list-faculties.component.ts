import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { createListManagerNoFilter } from '@builder/list-mng-no-filter.builder';
import { SystemConstant } from '@constants/system.constant';
import {
  IFaculty,
  IFacultyRequest,
  IFacultyTransferPmRequest,
  IFacultyUpdateRequest,
} from '@models/faculty/faculty.model';
import { IUser } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { FacultyService } from '@services/faculty/faculty.service';
import { UserService } from '@services/user/user.service';
import { notBlankValidator } from '@validators/trimmed.validator';
import { CsvImportModalComponent } from '@widget/csv-import-modal/csv-import-modal.component';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-list-faculties',
  templateUrl: './list-faculties.component.html',
  styleUrl: './list-faculties.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzModalModule,
    CsvImportModalComponent,
    TablePaginateComponent,
  ],
})
export class ListFacultiesComponent implements OnInit {
  private readonly facultySvc = inject(FacultyService);
  private readonly userSvc = inject(UserService);
  private readonly authSvc = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);
  private readonly nzModalSvc = inject(NzModalService);

  /** Quản lý danh sách phân trang (UI 1-indexed, backend 0-indexed) */
  readonly manager = createListManagerNoFilter<IFaculty>(
    (page: number, size: number) => this.facultySvc.getFaculties(page - 1, size),
  );

  readonly isAdmin = signal(false);
  readonly isImportModalVisible = signal(false);
  readonly searchKeyword = signal('');

  readonly downloadFacultyTemplate = () => this.facultySvc.downloadImportTemplate();
  readonly importFacultyCsv = (file: File) => this.facultySvc.importFaculties(file);
  readonly selectedSwitcherId = signal('');

  /** Lọc danh sách Khoa hiển thị theo từ khóa tìm kiếm */
  readonly displayFaculties = computed(() => {
    const list = this.manager.listData().data || [];
    const kw = this.searchKeyword().toLowerCase().trim();
    if (!kw) {
      return list;
    }
    return list.filter(f => {
      const codeMatch = f.code.toLowerCase().includes(kw);
      const nameMatch = f.name.toLowerCase().includes(kw);
      const descMatch = (f.description ?? '').toLowerCase().includes(kw);
      return codeMatch || nameMatch || descMatch;
    });
  });

  /** Trạng thái Modal Thêm/Sửa Khoa */
  readonly isModalVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly editingFacultyId = signal<string | null>(null);
  readonly formErrorMsg = signal('');

  facultyForm!: FormGroup;

  /** Trạng thái Modal Cảnh báo 422 khi Khoa còn CTĐT đang hoạt động */
  readonly activeProgramWarningModalVisible = signal(false);
  readonly activeProgramWarningMessage = signal('');

  /** Trạng thái Modal Quản lý Program Manager (1 PM = 1 Khoa) */
  readonly isPmModalVisible = signal(false);
  readonly selectedFaculty = signal<IFaculty | null>(null);
  readonly assignedPms = signal<IUser[]>([]);
  readonly isPmsLoading = signal(false);
  readonly pmCandidates = signal<IUser[]>([]);
  readonly selectedPmUserId = signal('');
  readonly isAssigningPm = signal(false);
  readonly conflictError = signal<string | null>(null);

  /** Trạng thái Điều chuyển PM */
  readonly transferringPm = signal<IUser | null>(null);
  readonly allFaculties = signal<IFaculty[]>([]);
  readonly transferTargetFacultyId = signal('');
  readonly transferReason = signal('');
  readonly isSubmittingTransfer = signal(false);

  /** Danh sách Khoa đích hợp lệ khi điều chuyển PM: loại trừ Khoa hiện tại và Khoa bị vô hiệu hóa */
  readonly availableTargetFaculties = computed(() => {
    const currentId = this.selectedFaculty()?.id;
    const pool = this.allFaculties().length > 0
      ? this.allFaculties()
      : (this.manager.listData().data || []);
    return pool.filter(f => this.isFacultyActive(f) && f.id !== currentId);
  });

  isFacultyActive(faculty: IFaculty): boolean {
    return Boolean(faculty.isActive ?? faculty.active);
  }

  /** Nút xác nhận điều chuyển chỉ bật khi đã chọn Khoa đích và nhập lý do khác khoảng trắng */
  readonly canConfirmTransfer = computed(() => {
    return Boolean(this.transferTargetFacultyId().trim() && this.transferReason().trim());
  });

  ngOnInit(): void {
    const roles = this.authSvc.getRoles();
    this.isAdmin.set(roles.includes(SystemConstant.ROLE.ADMIN));

    this.initForm();
    this.manager.triggerReload();
  }

  private initForm(): void {
    this.facultyForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\s*[A-Za-z0-9_-]{2,20}\s*$/)]],
      name: ['', [Validators.required, notBlankValidator, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(500)]],
    });
  }

  clearSearch(): void {
    this.searchKeyword.set('');
  }

  // ==========================================================================
  // 1. Tạo mới / Chỉnh sửa Khoa
  // ==========================================================================

  openCreateModal(): void {
    this.editingFacultyId.set(null);
    this.formErrorMsg.set('');
    this.facultyForm.reset({
      code: '',
      name: '',
      description: '',
    });
    this.facultyForm.get('code')?.enable();
    this.isModalVisible.set(true);
  }

  openEditModal(item: IFaculty): void {
    this.editingFacultyId.set(item.id);
    this.formErrorMsg.set('');
    this.facultyForm.reset({
      code: item.code,
      name: item.name,
      description: item.description ?? '',
    });
    this.facultyForm.get('code')?.disable();
    this.isModalVisible.set(true);
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.formErrorMsg.set('');
  }

  submitFaculty(): void {
    if (this.facultyForm.invalid) {
      Object.values(this.facultyForm.controls).forEach(c => {
        c.markAsDirty();
        c.markAsTouched();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.isSubmitting.set(true);
    this.formErrorMsg.set('');
    const raw = this.facultyForm.getRawValue() as { code: string; name: string; description?: string; };
    const trimmedDesc = raw.description?.trim();
    const editId = this.editingFacultyId();

    if (editId) {
      const updateDto: IFacultyUpdateRequest = {
        name: raw.name.trim(),
        ...(trimmedDesc ? { description: trimmedDesc } : { description: '' }),
      };
      this.facultySvc.updateFaculty(editId, updateDto).subscribe({
        next: () => {
          this.alert.success('Cập nhật thông tin Khoa thành công');
          this.isSubmitting.set(false);
          this.closeModal();
          this.manager.triggerReload();
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          const apiErr = this.extractError(err);
          const msg = apiErr.message || 'Cập nhật Khoa không thành công';
          this.formErrorMsg.set(msg);
          this.alert.error(msg);
        },
      });
    } else {
      const createDto: IFacultyRequest = {
        code: raw.code.trim().toUpperCase(),
        name: raw.name.trim(),
        ...(trimmedDesc ? { description: trimmedDesc } : {}),
      };
      this.facultySvc.createFaculty(createDto).subscribe({
        next: () => {
          this.alert.success('Thêm Khoa mới thành công');
          this.isSubmitting.set(false);
          this.closeModal();
          this.manager.triggerReload();
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          const apiErr = this.extractError(err);
          const msg = apiErr.message || 'Thêm Khoa không thành công';
          this.formErrorMsg.set(msg);
          this.alert.error(msg);
        },
      });
    }
  }

  // ==========================================================================
  // 2. Bật / Tắt trạng thái hoạt động Khoa & xử lý lỗi 422
  // ==========================================================================

  toggleFacultyStatus(faculty: IFaculty): void {
    const targetActive = !this.isFacultyActive(faculty);
    const isDeactivating = !targetActive;

    this.nzModalSvc.confirm({
      nzWidth: 440,
      nzTitle: isDeactivating
        ? `Vô hiệu hóa Khoa ${faculty.code}?`
        : `Kích hoạt lại Khoa ${faculty.code}?`,
      nzContent: isDeactivating
        ? `Bạn có chắc chắn muốn vô hiệu hóa "${faculty.name}"? Khoa đang có chương trình đào tạo hoạt động sẽ không thể vô hiệu hóa.`
        : `Kích hoạt lại "${faculty.name}" để cho phép quản lý và hiển thị trên cổng thông tin.`,
      nzCancelText: 'Hủy',
      nzOkText: isDeactivating ? 'Vô hiệu hóa' : 'Kích hoạt',
      nzOkDanger: isDeactivating,
      nzOnOk: () => this.applyStatusToggle(faculty),
    });
  }

  applyStatusToggle(faculty: IFaculty): void {
    const targetActive = !this.isFacultyActive(faculty);
    this.selectedSwitcherId.set(faculty.id);

    this.facultySvc.updateFacultyStatus(faculty.id, { isActive: targetActive }).subscribe({
      next: () => {
        this.selectedSwitcherId.set('');
        this.alert.success(
          targetActive ? 'Đã kích hoạt Khoa thành công.' : 'Đã vô hiệu hóa Khoa thành công.',
        );
        this.manager.triggerReload();
      },
      error: (err: unknown) => {
        this.selectedSwitcherId.set('');
        const api = this.extractError(err);
        if (
          api.status === 422 ||
          api.code === 'FACULTY_HAS_ACTIVE_PROGRAMS' ||
          api.code === 'FACULTY_LOCKED_BY_PROGRAM_VERSION'
        ) {
          const warningMsg =
            api.message ||
            'Khoa còn chương trình đào tạo đang hoạt động (ACTIVE). Không thể tắt trạng thái hoạt động của Khoa.';
          this.activeProgramWarningMessage.set(warningMsg);
          this.activeProgramWarningModalVisible.set(true);
          this.nzModalSvc.warning({
            nzTitle: 'Không thể vô hiệu hóa Khoa',
            nzContent: warningMsg,
            nzOkText: 'Đã hiểu',
            nzWidth: 440,
            nzOnOk: () => this.closeActiveProgramWarning(),
          });
        } else {
          this.alert.error(api.message || 'Không thể thay đổi trạng thái Khoa.');
        }
        this.manager.triggerReload();
      },
    });
  }

  closeActiveProgramWarning(): void {
    this.activeProgramWarningModalVisible.set(false);
    this.activeProgramWarningMessage.set('');
  }

  // ==========================================================================
  // 3. Quản lý Program Manager (1 PM = 1 Khoa): Gán / Gỡ / Điều chuyển
  // ==========================================================================

  openPmModal(faculty: IFaculty): void {
    this.selectedFaculty.set(faculty);
    this.conflictError.set(null);
    this.selectedPmUserId.set('');
    this.transferringPm.set(null);
    this.transferTargetFacultyId.set('');
    this.transferReason.set('');
    this.isPmModalVisible.set(true);

    this.loadAssignedPms(faculty.id);
    this.loadPmCandidates();
    this.loadAllFaculties();
  }

  closePmModal(): void {
    this.isPmModalVisible.set(false);
    this.selectedFaculty.set(null);
    this.transferringPm.set(null);
    this.conflictError.set(null);
    this.selectedPmUserId.set('');
  }

  loadAssignedPms(facultyId: string): void {
    this.isPmsLoading.set(true);
    this.facultySvc.getProgramManagers(facultyId).pipe(
      catchError(() => of([] as IUser[])),
    ).subscribe(users => {
      this.assignedPms.set(users || []);
      this.isPmsLoading.set(false);
    });
  }

  private loadPmCandidates(): void {
    this.userSvc.filter(0, 100).pipe(
      catchError(() => of({ content: [] as IUser[], page: 0, size: 100, totalElements: 0, totalPages: 0, last: true })),
    ).subscribe(res => {
      const pms = (res.content || []).filter(
        u => u.status === 'ACTIVE' && u.roles?.includes(SystemConstant.ROLE.PROGRAM_MANAGER),
      );
      this.pmCandidates.set(pms);
    });
  }

  private loadAllFaculties(): void {
    this.facultySvc.getFaculties(0, 100).pipe(
      catchError(() => of({ content: [] as IFaculty[], page: 0, size: 100, totalElements: 0, totalPages: 0, last: true })),
    ).subscribe(res => {
      if (res.content?.length) {
        this.allFaculties.set(res.content);
      }
    });
  }

  assignPm(): void {
    const faculty = this.selectedFaculty();
    const userId = this.selectedPmUserId().trim();
    if (!faculty || !userId) {
      return;
    }

    this.isAssigningPm.set(true);
    this.conflictError.set(null);

    this.facultySvc.assignProgramManager(faculty.id, { userId }).subscribe({
      next: () => {
        this.isAssigningPm.set(false);
        this.selectedPmUserId.set('');
        this.alert.success('Gán Program Manager cho Khoa thành công');
        this.loadAssignedPms(faculty.id);
        this.manager.triggerReload();
      },
      error: (err: unknown) => {
        this.isAssigningPm.set(false);
        const apiErr = this.extractError(err);
        if (apiErr.status === 409 || apiErr.code === 'PM_ALREADY_ASSIGNED') {
          const msg =
            apiErr.message ||
            'Người dùng đã là Program Manager của Khoa khác. Vi phạm ràng buộc 1 PM = 1 Khoa.';
          this.conflictError.set(msg);
          this.alert.error(msg);
        } else {
          this.alert.error(apiErr.message || 'Không thể gán Program Manager');
        }
      },
    });
  }

  confirmRemovePm(pm: IUser): void {
    const faculty = this.selectedFaculty();
    if (!faculty) {
      return;
    }

    this.nzModalSvc.confirm({
      nzWidth: 420,
      nzTitle: `Gỡ Program Manager ${pm.fullName || pm.username}?`,
      nzContent: `Người dùng "${pm.fullName || pm.username}" sẽ không còn phụ trách "${faculty.name}".`,
      nzCancelText: 'Hủy',
      nzOkText: 'Gỡ PM',
      nzOkDanger: true,
      nzOnOk: () => this.removePm(pm.id),
    });
  }

  removePm(userId: string): void {
    const faculty = this.selectedFaculty();
    if (!faculty) {
      return;
    }

    this.facultySvc.removeProgramManager(faculty.id, userId).subscribe({
      next: () => {
        this.alert.success('Đã gỡ Program Manager khỏi Khoa');
        this.loadAssignedPms(faculty.id);
        this.manager.triggerReload();
      },
      error: (err: unknown) => {
        const apiErr = this.extractError(err);
        this.alert.error(apiErr.message || 'Không thể gỡ Program Manager');
      },
    });
  }

  openTransferModal(pm: IUser): void {
    this.transferringPm.set(pm);
    this.transferTargetFacultyId.set('');
    this.transferReason.set('');
    this.conflictError.set(null);
  }

  cancelTransfer(): void {
    this.transferringPm.set(null);
    this.transferTargetFacultyId.set('');
    this.transferReason.set('');
  }

  confirmTransfer(): void {
    const pm = this.transferringPm();
    const faculty = this.selectedFaculty();
    if (!pm || !faculty || !this.canConfirmTransfer()) {
      return;
    }

    const dto: IFacultyTransferPmRequest = {
      userId: pm.id,
      targetFacultyId: this.transferTargetFacultyId().trim(),
      transferReason: this.transferReason().trim(),
    };

    this.isSubmittingTransfer.set(true);
    this.facultySvc.transferProgramManager(dto).subscribe({
      next: () => {
        this.isSubmittingTransfer.set(false);
        this.alert.success('Điều chuyển Program Manager thành công');
        this.cancelTransfer();
        this.loadAssignedPms(faculty.id);
        this.manager.triggerReload();
      },
      error: (err: unknown) => {
        this.isSubmittingTransfer.set(false);
        const apiErr = this.extractError(err);
        this.alert.error(apiErr.message || 'Điều chuyển Program Manager không thành công');
      },
    });
  }

  openImportModal(): void {
    this.isImportModalVisible.set(true);
  }

  onImportSuccess(): void {
    this.manager.triggerReload();
  }

  private extractError(err: unknown): { status: number; code: string; message: string; } {
    const api = toApiError(err);
    if (api) {
      return { status: api.status, code: api.code, message: api.message };
    }
    if (err instanceof HttpErrorResponse) {
      const body = (typeof err.error === 'object' && err.error !== null)
        ? (err.error as { code?: unknown; message?: unknown; })
        : {};
      return {
        status: err.status,
        code: typeof body.code === 'string' ? body.code : '',
        message: typeof body.message === 'string' ? body.message : '',
      };
    }
    return { status: 0, code: '', message: '' };
  }
}
