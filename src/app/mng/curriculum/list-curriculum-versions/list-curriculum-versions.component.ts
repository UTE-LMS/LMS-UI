import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IRoleAssignment } from '@models/user/user.model';
import { IProgram } from '@models/program/program.model';
import {
  IProgramVersion,
  IProgramVersionRequest,
} from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ProgramService } from '@services/program/program.service';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { VerificationBadgeComponent } from '@widget/verification-badge/verification-badge.component';
import { Paginate } from '@widget/paginate/paginate.model';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { VerificationActionModalComponent } from '../detail-curriculum-version/verification-action-modal/verification-action-modal.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-list-curriculum-versions',
  templateUrl: './list-curriculum-versions.component.html',
  styleUrl: './list-curriculum-versions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NzTableModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    StatusChipComponent,
    VerificationBadgeComponent,
    VerificationActionModalComponent,
    TablePaginateComponent,
  ],
})
export class ListCurriculumVersionsComponent implements OnInit {
  private readonly programSvc = inject(ProgramService);
  private readonly versionSvc = inject(ProgramVersionService);
  private readonly ploPiSvc = inject(PloPiService);
  private readonly authSvc = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(ToastrService);
  private readonly modal = inject(NzModalService);

  readonly urlConst = UrlConstant;

  readonly programs = signal<IProgram[]>([]);
  readonly selectedProgramId = signal<string>('');
  readonly versions = signal<IProgramVersion[]>([]);
  readonly isLoading = signal(false);

  readonly ploCountMap = signal<Record<string, number>>({});
  readonly piCountMap = signal<Record<string, number>>({});

  readonly page = signal(1);
  readonly size = signal(20);
  readonly total = signal(0);

  readonly pageData = computed(() => new Paginate<IProgramVersion>(
    this.page(),
    Math.ceil(this.total() / this.size()) || 1,
    this.total(),
    this.size(),
    this.versions(),
  ));

  readonly userRoles = signal<string[]>([]);

  readonly selectedProgram = computed(() => {
    const id = this.selectedProgramId();
    return this.programs().find(p => p.id === id) ?? null;
  });

  /** Kiểm tra quyền ghi: chỉ PROGRAM_MANAGER có quyền trong scope (ADR 0005: ADMIN không can thiệp chuyên môn) */
  readonly canManage = computed(() => {
    const roles = this.userRoles();
    if (!roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)) {
      return false;
    }
    // Kiểm tra scope programIds nếu có
    const assignments = this.authSvc.getRoleAssignments();
    const pmAssignment = assignments.find(
      (r: IRoleAssignment) => r.role === SystemConstant.ROLE.PROGRAM_MANAGER,
    );
    const scopeProgramIds = pmAssignment?.scope?.programIds ?? [];
    if (!scopeProgramIds.length) {
      return true;
    }
    return scopeProgramIds.includes(this.selectedProgramId());
  });

  /** Kiểm tra vai trò QA: Người duy nhất có quyền thẩm định ĐBCL (ADR 0014) */
  readonly isQaOfficer = computed(() => {
    const roles = this.userRoles();
    return roles.includes(SystemConstant.ROLE.QA);
  });

  // Modal tạo / clone
  readonly isModalVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly modalTitle = signal('Tạo phiên bản CTĐT mới');
  versionForm!: FormGroup;

  // Modal Thẩm định ĐBCL (US-08 dành riêng cho QA)
  readonly isVerifyModalVisible = signal(false);
  readonly selectedVersionForVerify = signal<IProgramVersion | null>(null);

  ngOnInit(): void {
    this.userRoles.set(this.authSvc.getRoles());
    this.initForm();
    this.loadPrograms();
  }

  private initForm(): void {
    this.versionForm = this.fb.group({
      version: ['', [Validators.required, Validators.maxLength(100)]],
      totalCredits: [null, [Validators.min(0)]],
      durationYears: [null, [Validators.min(0)]],
      applicableCohorts: [[]],
    });
  }

  loadPrograms(): void {
    this.programSvc.getPrograms(0, 100).subscribe({
      next: res => {
        const list = res.content || [];
        this.programs.set(list);

        // Lấy param từ query params nếu có
        const queryProgId = this.route.snapshot.queryParamMap.get('programId');
        if (queryProgId && list.some(p => p.id === queryProgId)) {
          this.selectedProgramId.set(queryProgId);
        } else if (list.length > 0) {
          // Lọc ưu tiên theo scope nếu có
          const assignments = this.authSvc.getRoleAssignments();
          const pm = assignments.find((r: IRoleAssignment) => r.role === SystemConstant.ROLE.PROGRAM_MANAGER);
          const scoped = pm?.scope?.programIds ?? [];
          const firstScoped = list.find(p => scoped.includes(p.id));
          this.selectedProgramId.set(firstScoped ? firstScoped.id : list[0].id);
        }

        if (this.selectedProgramId()) {
          this.loadVersions();
        }
      },
      error: () => {
        this.alert.error('Không thể tải danh sách chương trình đào tạo');
      },
    });
  }

  onSelectProgram(programId: string): void {
    this.selectedProgramId.set(programId);
    this.page.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { programId },
      queryParamsHandling: 'merge',
    });
    this.loadVersions();
  }

  loadVersions(): void {
    const progId = this.selectedProgramId();
    if (!progId) {
      this.versions.set([]);
      this.total.set(0);
      return;
    }

    this.isLoading.set(true);
    this.versionSvc
      .getProgramVersions(this.page() - 1, this.size(), progId)
      .subscribe({
        next: res => {
          this.isLoading.set(false);
          const vList = res.content || [];
          this.versions.set(vList);
          this.total.set(res.totalElements ?? vList.length);

          // Tải số lượng PLO và PI cho các phiên bản
          this.loadPloPiCounts(vList);
        },
        error: err => {
          this.isLoading.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể tải danh sách phiên bản');
        },
      });
  }

  private loadPloPiCounts(vList: IProgramVersion[]): void {
    vList.forEach(v => {
      forkJoin({
        plos: this.ploPiSvc.getPlos(v.id).pipe(catchError(() => of([]))),
        pis: this.ploPiSvc.getPis(v.id).pipe(catchError(() => of([]))),
      }).subscribe(({ plos, pis }) => {
        this.ploCountMap.update(m => ({ ...m, [v.id]: plos.length }));
        this.piCountMap.update(m => ({ ...m, [v.id]: pis.length }));
      });
    });
  }

  getPloCount(versionId: string): string | number {
    const count = this.ploCountMap()[versionId];
    return typeof count === 'number' ? count : '—';
  }

  getPiCount(versionId: string): string | number {
    const count = this.piCountMap()[versionId];
    return typeof count === 'number' ? count : '—';
  }

  formatCohorts(cohorts?: string[]): string {
    if (!cohorts || cohorts.length === 0) {
      return '—';
    }
    return cohorts.join(', ');
  }

  onPageChange(config: Paginate<IProgramVersion>): void {
    this.page.set(config.currentPage);
    this.size.set(config.limit);
    this.loadVersions();
  }

  openCreateModal(): void {
    this.modalTitle.set('Tạo phiên bản CTĐT mới');
    this.versionForm.reset({
      version: '',
      totalCredits: null,
      durationYears: null,
      applicableCohorts: [],
    });
    this.isModalVisible.set(true);
  }

  openCloneModal(baseVersion: IProgramVersion): void {
    this.modalTitle.set(`Tạo bản nháp mới từ [${baseVersion.version}]`);
    this.versionForm.reset({
      version: `${baseVersion.version}-Draft`,
      totalCredits: baseVersion.totalCredits ?? null,
      durationYears: baseVersion.durationYears ?? null,
      applicableCohorts: [...(baseVersion.applicableCohorts ?? [])],
    });
    this.isModalVisible.set(true);
  }

  closeModal(): void {
    this.isModalVisible.set(false);
  }

  submitVersionForm(): void {
    if (this.versionForm.invalid) {
      Object.values(this.versionForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const formVal = this.versionForm.getRawValue() as {
      version: string;
      totalCredits?: number | null;
      durationYears?: number | null;
      applicableCohorts?: string[];
    };
    const req: IProgramVersionRequest = {
      programId: this.selectedProgramId(),
      version: formVal.version.trim(),
      totalCredits: formVal.totalCredits != null ? Number(formVal.totalCredits) : undefined,
      durationYears: formVal.durationYears != null ? Number(formVal.durationYears) : undefined,
      applicableCohorts: formVal.applicableCohorts ?? [],
    };

    this.isSubmitting.set(true);
    this.versionSvc.createProgramVersion(req).subscribe({
      next: created => {
        this.isSubmitting.set(false);
        this.alert.success(`Tạo phiên bản [${created.version}] thành công`);
        this.closeModal();
        this.loadVersions();
      },
      error: err => {
        this.isSubmitting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể tạo phiên bản mới');
      },
    });
  }

  openVerifyModal(version: IProgramVersion): void {
    this.selectedVersionForVerify.set(version);
    this.isVerifyModalVisible.set(true);
  }

  confirmActivateVersion(version: IProgramVersion): void {
    if (!this.canManage()) {
      this.alert.error('Chỉ Trưởng chương trình đào tạo mới có quyền phê duyệt đưa phiên bản CTĐT vào áp dụng.');
      return;
    }

    if (version.verification?.status !== 'VERIFIED') {
      this.modal.warning({
        nzTitle: 'Chưa đủ điều kiện áp dụng',
        nzContent: `Phiên bản [${version.version}] chưa được Cán bộ ĐBCL thẩm định ĐÃ XÁC NHẬN. Vui lòng hoàn tất thẩm định ĐBCL trước khi phê duyệt áp dụng.`,
        nzOkText: 'Duyệt ĐBCL ngay',
        nzOnOk: () => this.openVerifyModal(version),
      });
      return;
    }

    this.modal.confirm({
      nzTitle: 'Phê duyệt áp dụng phiên bản CTĐT',
      nzContent: `Bạn có chắc chắn muốn phê duyệt áp dụng phiên bản [${version.version}]? Sau khi áp dụng, phiên bản sẽ có hiệu lực chính thức và bị khóa không thể sửa đè.`,
      nzOkText: 'Phê duyệt áp dụng',
      nzOkType: 'primary',
      nzOnOk: () => {
        this.versionSvc.updateProgramVersionStatus(version.id, { status: 'ACTIVE' }).subscribe({
          next: () => {
            this.alert.success(`Phiên bản [${version.version}] đã chuyển sang Đang áp dụng chính thức`);
            this.loadVersions();
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể áp dụng phiên bản');
          },
        });
      },
    });
  }
}
