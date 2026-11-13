import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IClo, ICloMeasurement, ICloRequest } from '@models/course/clo.model';
import { ICourse } from '@models/course/course.model';
import { ISyllabus, SyllabusStatus } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { IRoleAssignment } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CloService } from '@services/course/clo.service';
import { CourseService } from '@services/course/course.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { VerificationBadgeComponent } from '@widget/verification-badge/verification-badge.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';

export interface IBloomOption {
  level: number;
  label: string;
}

@Component({
  selector: 'app-detail-syllabus',
  templateUrl: './detail-syllabus.component.html',
  styleUrl: './detail-syllabus.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NzTableModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    StatusChipComponent,
    VerificationBadgeComponent,
    BloomLevelLabelComponent,
  ],
})
export class DetailSyllabusComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly courseSvc = inject(CourseService);
  private readonly cloSvc = inject(CloService);
  private readonly termSvc = inject(TermService);
  private readonly authSvc = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);
  private readonly nzModal = inject(NzModalService);

  readonly syllabusId = signal<string>('');
  readonly syllabus = signal<ISyllabus | null>(null);
  readonly course = signal<ICourse | null>(null);
  readonly clos = signal<IClo[]>([]);
  readonly terms = signal<ITerm[]>([]);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly userRoles = signal<string[]>([]);
  readonly scopeCourseIds = signal<string[]>([]);

  /** Modal Thêm / Sửa CLO */
  readonly isCloModalVisible = signal(false);
  readonly editingClo = signal<IClo | null>(null);
  readonly isSubmittingClo = signal(false);

  readonly bloomOptions: IBloomOption[] = [
    { level: 1, label: 'Mức 1 — Nhớ (Remember)' },
    { level: 2, label: 'Mức 2 — Hiểu (Understand)' },
    { level: 3, label: 'Mức 3 — Áp dụng (Apply)' },
    { level: 4, label: 'Mức 4 — Phân tích (Analyze)' },
    { level: 5, label: 'Mức 5 — Đánh giá (Evaluate)' },
    { level: 6, label: 'Mức 6 — Sáng tạo (Create)' },
  ];

  readonly isAdmin = computed(() => this.userRoles().includes(SystemConstant.ROLE.ADMIN));

  readonly isCourseInScope = computed(() => {
    const cid = this.syllabus()?.courseId;
    return !!cid && this.scopeCourseIds().includes(cid);
  });

  /**
   * Quyền phê duyệt đề cương CONFIRMED / ARCHIVED (ADR 0014):
   * Chỉ duy nhất PROGRAM_MANAGER có môn học trong scope.
   * ADMIN không có thẩm quyền học thuật để phê duyệt.
   * Giảng viên (LECTURER) không có quyền duyệt đề cương.
   */
  readonly canApproveSyllabus = computed(() => {
    if (this.isAdmin()) {
      return false;
    }
    return (
      this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER) && this.isCourseInScope()
    );
  });

  /**
   * Bất biến TD-27 & ADR 0014:
   * Khi syllabus.status !== 'DRAFT', khóa cứng 100% thao tác thêm/sửa/xóa CLO.
   * Khi ở DRAFT, chỉ LECTURER hoặc PROGRAM_MANAGER có môn học trong scope mới được sửa CLO.
   * ADMIN không có thẩm quyền học thuật để thêm/sửa/xóa CLO.
   */
  readonly canEditClo = computed(() => {
    const syl = this.syllabus();
    if (syl?.status !== 'DRAFT' || this.isAdmin()) {
      return false;
    }
    const roles = this.userRoles();
    const isAuthorRole =
      roles.includes(SystemConstant.ROLE.LECTURER)
      || roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER);
    return isAuthorRole && this.isCourseInScope();
  });

  /** Sắp xếp CLO tăng dần theo số thứ tự trong mã CLO1, CLO2, ..., CLO10 */
  readonly sortedClos = computed(() => {
    const list = [...this.clos()];
    return list.sort((a, b) => {
      const numA = Number.parseInt(a.code.replace(/\D+/g, ''), 10) || 0;
      const numB = Number.parseInt(b.code.replace(/\D+/g, ''), 10) || 0;
      return numA - numB || a.code.localeCompare(b.code);
    });
  });

  readonly cloForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^CLO[0-9]+$/)]],
    bloomLevel: [3, [Validators.required, Validators.min(1), Validators.max(6)]],
    bloomNote: [''],
    contentOriginal: [''],
    defaultWeight: [null as number | null, [Validators.min(0), Validators.max(1)]],
    defaultPassThreshold: [null as number | null, [Validators.min(0), Validators.max(1)]],
  });

  ngOnInit(): void {
    this.userRoles.set(this.authSvc.getRoles());
    const assignments = this.authSvc.getRoleAssignments();
    const courseIds = new Set<string>();
    assignments.forEach((a: IRoleAssignment) => {
      (a.scope?.courseIds ?? []).forEach(id => courseIds.add(id));
    });
    this.scopeCourseIds.set(Array.from(courseIds));

    this.termSvc.getTerms().subscribe({
      next: list => this.terms.set(list || []),
      error: () => undefined,
    });

    const id = this.route.snapshot.paramMap.get('syllabusId');
    if (id) {
      this.syllabusId.set(id);
      this.loadSyllabusData(id);
    }
  }

  loadSyllabusData(id = this.syllabusId()): void {
    if (!id) {
      return;
    }
    this.isLoading.set(true);
    this.hasError.set(false);

    this.syllabusSvc.getSyllabusById(id).subscribe({
      next: syl => {
        this.syllabus.set(syl);
        this.courseSvc.getCourseById(syl.courseId).subscribe({
          next: c => this.course.set(c),
          error: () => undefined,
        });
        this.cloSvc.getClosBySyllabus(id).subscribe({
          next: list => {
            this.isLoading.set(false);
            this.clos.set(list || []);
          },
          error: () => {
            this.isLoading.set(false);
            this.hasError.set(true);
          },
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
      },
    });
  }

  getTermCode(termId?: string | null): string {
    if (!termId) {
      return '—';
    }
    return this.terms().find(t => t.id === termId)?.code ?? termId;
  }

  formatRatio(val?: number | null): string {
    if (val === null || val === undefined) {
      return '—';
    }
    return `${Math.round(val * 10000) / 100}% (${val})`;
  }

  changeStatus(nextStatus: SyllabusStatus): void {
    const syl = this.syllabus();
    if (!syl || !this.canApproveSyllabus()) {
      return;
    }

    this.syllabusSvc.updateSyllabusStatus(syl.id, nextStatus).subscribe({
      next: updated => {
        this.syllabus.set(updated);
        this.alert.success(
          nextStatus === 'CONFIRMED'
            ? 'Đã phê duyệt đề cương chính thức (CONFIRMED). Danh sách CLO đã được khóa bảo vệ.'
            : 'Đã chuyển đề cương vào lưu trữ (ARCHIVED).',
        );
      },
      error: err => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể chuyển trạng thái đề cương');
      },
    });
  }

  openCreateCloModal(): void {
    if (!this.canEditClo()) {
      return;
    }
    this.editingClo.set(null);
    const nextIdx = this.clos().length + 1;
    this.cloForm.reset({
      code: `CLO${nextIdx}`,
      bloomLevel: 3,
      bloomNote: '',
      contentOriginal: '',
      defaultWeight: null,
      defaultPassThreshold: null,
    });
    this.isCloModalVisible.set(true);
  }

  openEditCloModal(clo: IClo): void {
    if (!this.canEditClo()) {
      return;
    }
    this.editingClo.set(clo);
    this.cloForm.reset({
      code: clo.code,
      bloomLevel: clo.bloomLevel,
      bloomNote: clo.bloomNote ?? '',
      contentOriginal: clo.contentOriginal ?? '',
      defaultWeight: clo.measurement?.defaultWeight ?? null,
      defaultPassThreshold: clo.measurement?.defaultPassThreshold ?? null,
    });
    this.isCloModalVisible.set(true);
  }

  submitClo(): void {
    if (!this.canEditClo()) {
      return;
    }
    if (this.cloForm.invalid) {
      Object.values(this.cloForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const raw = this.cloForm.getRawValue() as {
      code: string;
      bloomLevel: number;
      bloomNote: string;
      contentOriginal: string;
      defaultWeight: number | string | null;
      defaultPassThreshold: number | string | null;
    };

    const parsedWeight =
      raw.defaultWeight !== null && raw.defaultWeight !== '' && raw.defaultWeight !== undefined
        ? Number(raw.defaultWeight)
        : null;
    const parsedThreshold =
      raw.defaultPassThreshold !== null
      && raw.defaultPassThreshold !== ''
      && raw.defaultPassThreshold !== undefined
        ? Number(raw.defaultPassThreshold)
        : null;

    const measurement: ICloMeasurement | null =
      parsedWeight !== null || parsedThreshold !== null
        ? { defaultWeight: parsedWeight, defaultPassThreshold: parsedThreshold }
        : null;

    const payload: ICloRequest = {
      code: raw.code.trim().toUpperCase(),
      bloomLevel: Number(raw.bloomLevel),
      bloomNote: raw.bloomNote?.trim() || null,
      contentOriginal: raw.contentOriginal?.trim() || null,
      measurement,
    };

    this.isSubmittingClo.set(true);
    const current = this.editingClo();

    if (current) {
      this.cloSvc.updateClo(current.id, payload).subscribe({
        next: updated => {
          this.isSubmittingClo.set(false);
          this.isCloModalVisible.set(false);
          this.clos.update(list => list.map(item => (item.id === updated.id ? updated : item)));
          this.alert.success(`Đã cập nhật ${updated.code}`);
        },
        error: err => {
          this.isSubmittingClo.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể cập nhật CLO');
        },
      });
    } else {
      this.cloSvc.createClo(this.syllabusId(), payload).subscribe({
        next: created => {
          this.isSubmittingClo.set(false);
          this.isCloModalVisible.set(false);
          this.clos.update(list => [...list, created]);
          this.alert.success(`Đã thêm chuẩn đầu ra ${created.code}`);
        },
        error: err => {
          this.isSubmittingClo.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể thêm CLO');
        },
      });
    }
  }

  deleteClo(clo: IClo): void {
    if (!this.canEditClo()) {
      return;
    }
    this.nzModal.confirm({
      nzTitle: `Xóa chuẩn đầu ra ${clo.code}?`,
      nzContent: `Bạn có chắc chắn muốn xóa ${clo.code} khỏi đề cương đang soạn thảo?`,
      nzOkText: 'Xóa CLO',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.cloSvc.deleteClo(clo.id).subscribe({
          next: () => {
            this.clos.update(list => list.filter(item => item.id !== clo.id));
            this.alert.success(`Đã xóa ${clo.code}`);
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể xóa CLO');
          },
        });
      },
    });
  }
}
