import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { createListManagerNoFilter } from '@builder/list-mng-no-filter.builder';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IProgram, IProgramRequest } from '@models/program/program.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { ProgramService } from '@services/program/program.service';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
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
  private readonly authSvc = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);

  readonly urlConst = UrlConstant;

  /** Quản lý danh sách phân trang (UI 1-indexed, backend 0-indexed) */
  readonly manager = createListManagerNoFilter<IProgram>(
    (page: number, size: number) => this.programSvc.getPrograms(page - 1, size),
  );

  readonly isAdmin = signal(false);

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

    this.initForm();
    this.manager.triggerReload();
  }

  private initForm(): void {
    this.programForm = this.fb.group({
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
    this.editingProgramId.set(null);
    this.programForm.reset({
      code: '',
      name: '',
      level: 'Đại học',
      degree: 'Kỹ sư',
    });
    this.programForm.get('code')?.enable();
    this.isModalVisible.set(true);
  }

  openEditModal(item: IProgram): void {
    this.editingProgramId.set(item.id);
    this.programForm.reset({
      code: item.code,
      name: item.name,
      level: item.level,
      degree: item.degree,
    });
    // Không sửa mã chương trình đã có
    this.programForm.get('code')?.disable();
    this.isModalVisible.set(true);
  }

  closeModal(): void {
    this.isModalVisible.set(false);
  }

  submitProgram(): void {
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
      error: err => {
        this.isSubmitting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Thao tác không thành công');
      },
    });
  }
}
