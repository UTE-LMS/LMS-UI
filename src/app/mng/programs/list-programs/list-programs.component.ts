import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { createListManagerNoFilter } from '@builder/list-mng-no-filter.builder';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IFaculty } from '@models/faculty/faculty.model';
import { IProgram, IProgramRequest } from '@models/program/program.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { FacultyService } from '@services/faculty/faculty.service';
import { ProgramService } from '@services/program/program.service';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-list-programs',
  templateUrl: './list-programs.component.html',
  styleUrl: './list-programs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzGridModule,
    NzTableModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    RouterLink,
    TablePaginateComponent,
  ],
})
export class ListProgramsComponent implements OnInit {
  private readonly programSvc = inject(ProgramService);
  private readonly facultySvc = inject(FacultyService, { optional: true });
  private readonly authSvc = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);
  private readonly nzModalSvc = inject(NzModalService, { optional: true });

  readonly urlConst = UrlConstant;

  readonly isAdmin = signal(false);
  readonly isProgramManager = signal(false);
  readonly canManage = computed(() => this.isProgramManager());
  readonly faculties = signal<IFaculty[]>([]);

  /** Quản lý danh sách phân trang (UI 1-indexed, backend 0-indexed) */
  readonly manager = createListManagerNoFilter<IProgram>(
    (page: number, size: number) => {
      const facultyId =
        this.isProgramManager() && !this.isAdmin()
          ? this.authSvc.getFacultyId?.()
          : undefined;
      return facultyId
        ? this.programSvc.getPrograms(page - 1, size, facultyId)
        : this.programSvc.getPrograms(page - 1, size);
    },
  );

  /** Từ khóa tìm kiếm chương trình đào tạo */
  readonly searchKeyword = signal('');

  /** Lọc danh sách hiển thị theo từ khóa tìm kiếm */
  readonly displayPrograms = computed(() => {
    const list = this.manager.listData().data || [];
    const kw = this.searchKeyword().toLowerCase().trim();
    if (!kw) {
      return list;
    }
    return list.filter(p => {
      const codeMatch = p.code.toLowerCase().includes(kw);
      const nameMatch = p.name.toLowerCase().includes(kw);
      const levelMatch = p.level.toLowerCase().includes(kw);
      const degreeMatch = p.degree.toLowerCase().includes(kw);
      return codeMatch || nameMatch || levelMatch || degreeMatch;
    });
  });

  /** Trạng thái Modal Thêm/Sửa CTĐT */
  readonly isModalVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly editingProgramId = signal<string | null>(null);

  programForm!: FormGroup;

  ngOnInit(): void {
    const roles = this.authSvc.getRoles();
    this.isAdmin.set(roles.includes(SystemConstant.ROLE.ADMIN));
    this.isProgramManager.set(roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER));

    this.initForm();
    if (this.canManage()) {
      this.loadFaculties();
    }
    this.manager.triggerReload();
  }

  private loadFaculties(): void {
    this.facultySvc?.getFaculties(0, 100, undefined, true).subscribe({
      next: res => {
        this.faculties.set(res.content || []);
      },
      error: () => undefined,
    });
  }

  private initForm(): void {
    const defaultFacultyId =
      this.isProgramManager() && !this.isAdmin()
        ? (this.authSvc.getFacultyId?.() ?? '')
        : '';
    this.programForm = this.fb.group({
      facultyId: [defaultFacultyId],
      code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{2,20}$/)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      level: ['Đại học', [Validators.required]],
      degree: ['Kỹ sư', [Validators.required]],
    });
  }

  clearSearch(): void {
    this.searchKeyword.set('');
  }

  openCreateModal(): void {
    if (!this.canManage()) {
      return;
    }
    const isPmOnly = this.isProgramManager() && !this.isAdmin();
    const pmFacultyId = this.authSvc.getFacultyId?.() ?? '';
    this.editingProgramId.set(null);
    this.programForm.reset({
      facultyId: isPmOnly ? pmFacultyId : '',
      code: '',
      name: '',
      level: 'Đại học',
      degree: 'Kỹ sư',
    });
    this.programForm.get('code')?.enable();
    if (isPmOnly) {
      this.programForm.get('facultyId')?.disable();
    } else {
      this.programForm.get('facultyId')?.enable();
    }
    this.isModalVisible.set(true);
  }

  openEditModal(item: IProgram): void {
    if (!this.canManage()) {
      return;
    }
    const isPmOnly = this.isProgramManager() && !this.isAdmin();
    const pmFacultyId = this.authSvc.getFacultyId?.() ?? '';
    this.editingProgramId.set(item.id);
    this.programForm.reset({
      facultyId: item.facultyId ?? (isPmOnly ? pmFacultyId : ''),
      code: item.code,
      name: item.name,
      level: item.level,
      degree: item.degree,
    });
    // Không sửa mã chương trình đã có
    this.programForm.get('code')?.disable();
    if (isPmOnly) {
      this.programForm.get('facultyId')?.disable();
    } else {
      this.programForm.get('facultyId')?.enable();
    }
    this.isModalVisible.set(true);
  }

  closeModal(): void {
    this.isModalVisible.set(false);
  }

  submitProgram(): void {
    if (!this.canManage()) {
      return;
    }
    if (this.programForm.invalid) {
      Object.values(this.programForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.programForm.getRawValue() as IProgramRequest;
    const req: IProgramRequest = {
      code: formVal.code.trim().toUpperCase(),
      name: formVal.name.trim(),
      level: formVal.level,
      degree: formVal.degree,
      ...(formVal.facultyId ? { facultyId: formVal.facultyId } : {}),
    };

    const editId = this.editingProgramId();
    const action$ = editId
      ? this.programSvc.updateProgram(editId, req)
      : this.programSvc.createProgram(req);

    action$.subscribe({
      next: () => {
        this.alert.success(editId ? 'Cập nhật chương trình đào tạo thành công' : 'Thêm chương trình đào tạo thành công');
        this.isSubmitting.set(false);
        this.closeModal();
        this.manager.triggerReload();
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        const apiErr = toApiError(err);
        const httpErr = err as HttpErrorResponse | undefined;
        const errBody = httpErr?.error as { code?: string; message?: string; } | undefined;
        const code = apiErr?.code ?? errBody?.code;
        const status = apiErr?.status ?? httpErr?.status;
        if (status === 422 || code === 'PROGRAM_LOCKED_BY_VERSION') {
          const rawMsg = (apiErr?.message ?? errBody?.message ?? '').trim();
          const msg =
            rawMsg.length > 0
              ? rawMsg
              : 'Chương trình đào tạo đã có phiên bản ban hành. Không được chỉnh sửa.';
          this.nzModalSvc?.warning({
            nzTitle: 'Không thể chỉnh sửa chương trình đào tạo',
            nzContent: msg,
            nzOkText: 'Đã hiểu',
            nzWidth: 460,
          });
          return;
        }
        this.alert.error(apiErr?.message ?? 'Thao tác không thành công');
      },
    });
  }
}
