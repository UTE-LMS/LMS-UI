import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SystemConstant } from '@constants/system.constant';
import { MakeForm } from '@models/common/make-form.model';
import { ModalData } from '@models/common/modal-data.model';
import { IApiError } from '@models/common/response-data.model';
import { IRoleAssignment, IUser, IUserCreateDTO, IUserUpdateDTO, UserRole } from '@models/user/user.model';
import { toApiError } from '@services/common/api-error.util';
import { FormValidatorService } from '@services/common/form-validator.service';
import { UserService } from '@services/user/user.service';
import { notBlankValidator, trimmedEmailValidator, trimmedMinLength } from '@validators/trimmed.validator';
import { objectIdListValidator } from '@validators/object-id-list.validator';
import { passwordBytesValidator } from '@validators/password-bytes.validator';
import { FieldErrorDisplayComponent } from '@widget/field-error-display/field-error-display.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, EMPTY, exhaustMap, filter, finalize, Subject, tap } from 'rxjs';
import { IRoleAssignmentRow, ROLE_LABELS, toAssignmentRow, toRoleAssignment } from '../users.util';

type RoleRowForm = FormGroup<MakeForm<IRoleAssignmentRow>>;

/** Tên trường backend có thể trả trong fieldErrors → ô nhập tương ứng trên form. */
type ServerFieldKey = 'username' | 'email' | 'password' | 'fullName';

@Component({
  selector: 'app-form-users',
  imports: [
    ReactiveFormsModule,
    NzInputModule,
    NzGridModule,
    NzButtonModule,
    NzSelectModule,
    NzTableModule,
    FieldErrorDisplayComponent,
  ],
  templateUrl: './form-users.component.html',
  styleUrl: './form-users.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormUsersComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly userSvc = inject(UserService);
  protected readonly formValidSvc = inject(FormValidatorService);
  private readonly alert = inject(ToastrService);

  readonly modalData = input.required<ModalData<IUser>>();
  readonly closeModal = output<boolean>();

  form!: FormGroup<MakeForm<IUserCreateDTO>>;

  protected readonly roleOptions = SystemConstant.ROLE_TITLE.map(item => ({ value: item.id, label: item.title.vi }));
  protected readonly adminRole: UserRole = SystemConstant.ROLE.ADMIN;
  private readonly defaultRole: UserRole = SystemConstant.ROLE.LECTURER;
  protected readonly roleLabels = ROLE_LABELS;

  /** Mỗi phần tử là một dòng "vai trò + phạm vi" (rulebook §3.1.10: signal các FormGroup con). */
  readonly roleForms = signal<RoleRowForm[]>([]);

  readonly isSubmitting = signal(false);
  /** Lỗi tổng của form, hiển thị ở thanh dưới (409/422/400 không gắn được vào ô nhập). */
  readonly formErrorMsg = signal('');
  /** Lỗi nghiệp vụ của danh sách vai trò (chưa có dòng nào, dòng không hợp lệ). */
  readonly rolesErrorMsg = signal('');
  /** Lỗi theo trường do backend trả (400 fieldErrors, 409 trùng). Xóa khi người dùng sửa lại ô đó. */
  readonly serverFieldErrors = signal<Partial<Record<ServerFieldKey, string>>>({});

  private readonly submit$ = new Subject<void>();

  constructor() {
    this.setupSubmitStream();
  }

  get isEdit(): boolean {
    return this.modalData().action === SystemConstant.ACTION.EDIT;
  }

  ngOnInit(): void {
    this.createForm();
  }

  createForm(): void {
    this.form = this.fb.group({
      username: ['', [Validators.required, notBlankValidator, trimmedMinLength(3)]],
      password: ['', [Validators.required, passwordBytesValidator]],
      email: ['', [Validators.required, notBlankValidator, trimmedEmailValidator]],
      fullName: ['', [Validators.required, notBlankValidator]],
      roleAssignments: [[] as IRoleAssignment[], [Validators.required]],
    });

    const modalData = this.modalData();
    if (modalData.action === SystemConstant.ACTION.EDIT && modalData.data) {
      this.form.patchValue({
        username: modalData.data.username,
        email: modalData.data.email,
        fullName: modalData.data.fullName,
      });
      // Username bất biến và không đổi mật khẩu qua form này (API-CONTRACT.md §5.3.4)
      this.form.controls.username.disable();
      this.form.controls.password.disable();
      this.roleForms.set(modalData.data.roleAssignments.map(item => this.createRoleForm(toAssignmentRow(item))));
    } else {
      this.roleForms.set([this.createRoleForm()]);
    }

    // Sửa lại ô nào thì bỏ lỗi máy chủ cũ của ô đó
    for (const key of ['username', 'email', 'password', 'fullName'] as const) {
      this.form.controls[key].valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.clearServerError(key));
    }
  }

  private createRoleForm(row?: IRoleAssignmentRow): RoleRowForm {
    return this.fb.group({
      role: [row?.role ?? this.defaultRole, [Validators.required]],
      programIds: [row?.programIds ?? [], [objectIdListValidator]],
      courseIds: [row?.courseIds ?? [], [objectIdListValidator]],
      sectionIds: [row?.sectionIds ?? [], [objectIdListValidator]],
    });
  }

  addRole(): void {
    this.roleForms.update(forms => [...forms, this.createRoleForm()]);
  }

  removeRole(index: number): void {
    this.roleForms.update(forms => forms.filter((_, current) => current !== index));
  }

  private clearServerError(key: ServerFieldKey): void {
    if (this.serverFieldErrors()[key]) {
      this.serverFieldErrors.update(errors => ({ ...errors, [key]: undefined }));
    }
  }

  onCancel(): void {
    this.closeModal.emit(false);
  }

  onSubmit(): void {
    this.submit$.next();
  }

  /** Đồng bộ các dòng vai trò vào control cha, rồi kiểm tra toàn bộ form và từng dòng. */
  private validateBeforeSubmit(): boolean {
    this.formErrorMsg.set('');
    this.rolesErrorMsg.set('');

    const rows = this.roleForms();
    this.form.controls.roleAssignments.setValue(rows.map(row => toRoleAssignment(row.getRawValue())));

    const rowsInvalid = rows.some(row => row.invalid);
    if (this.form.invalid || rowsInvalid) {
      this.formValidSvc.validateAllFormFields(this.form);
      rows.forEach(row => this.formValidSvc.validateAllFormFields(row));
      if (!rows.length) {
        this.rolesErrorMsg.set('Cần ít nhất một vai trò.');
      } else if (rowsInvalid) {
        this.rolesErrorMsg.set('Có mã phạm vi chưa đúng định dạng (24 ký tự hex).');
      }
      return false;
    }
    return true;
  }

  private setupSubmitStream(): void {
    this.submit$.pipe(
      filter(() => this.validateBeforeSubmit()),
      exhaustMap(() => {
        this.isSubmitting.set(true);
        const modalData = this.modalData();
        const raw = this.form.getRawValue();
        const apiCall = (modalData.action === SystemConstant.ACTION.EDIT && modalData.data?.id)
          ? this.userSvc.update(this.buildUpdateDto(raw), modalData.data.id)
          : this.userSvc.create(this.buildCreateDto(raw));

        return apiCall.pipe(
          tap(() => {
            this.closeModal.emit(true);
            this.alert.success(modalData.action === SystemConstant.ACTION.EDIT ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
          }),
          catchError((err: unknown) => {
            this.showServerError(toApiError(err));
            return EMPTY;
          }),
          finalize(() => this.isSubmitting.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  private buildCreateDto(raw: IUserCreateDTO): IUserCreateDTO {
    return {
      // Backend cũng trim + lowercase; làm sẵn để giá trị gửi đi đúng với giá trị người dùng thấy
      username: raw.username.trim().toLowerCase(),
      email: raw.email.trim().toLowerCase(),
      password: raw.password,
      fullName: raw.fullName.trim(),
      roleAssignments: raw.roleAssignments,
    };
  }

  private buildUpdateDto(raw: IUserCreateDTO): IUserUpdateDTO {
    return {
      email: raw.email.trim().toLowerCase(),
      fullName: raw.fullName.trim(),
      roleAssignments: raw.roleAssignments,
    };
  }

  /**
   * Ánh xạ lỗi 400/409/422 vào form, giữ nguyên dữ liệu người dùng đã nhập (API-CONTRACT.md §3).
   * Lỗi 403, 5xx và mất mạng đã được HandlerErrorService báo bằng toast.
   */
  private showServerError(api: IApiError | null): void {
    if (!api || api.status >= 500 || api.status === 403) {
      return;
    }
    const known: ServerFieldKey[] = ['username', 'email', 'password', 'fullName'];
    const unmapped: string[] = [];
    const fieldErrors: Partial<Record<ServerFieldKey, string>> = {};
    for (const item of api.fieldErrors ?? []) {
      const key = known.find(name => name === item.field);
      if (key) {
        fieldErrors[key] = item.message;
      } else if (item.field.startsWith('roleAssignments')) {
        this.rolesErrorMsg.set(item.message);
      } else {
        unmapped.push(item.message);
      }
    }
    this.serverFieldErrors.set(fieldErrors);
    for (const key of known) {
      if (fieldErrors[key]) {
        this.form.controls[key].markAsTouched();
      }
    }
    if (unmapped.length || !api.fieldErrors?.length) {
      // 409 trùng username/email và 422 quy tắc nghiệp vụ: dùng thông điệp của backend
      this.formErrorMsg.set(unmapped.length ? unmapped.join(' ') : api.message);
    }
  }
}
