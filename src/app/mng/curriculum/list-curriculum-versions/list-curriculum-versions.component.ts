import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IRoleAssignment } from '@models/user/user.model';
import { IProgram } from '@models/program/program.model';
import {
  IProgramCsvImportResponse,
  IProgramVersion,
} from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ProgramService } from '@services/program/program.service';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { Paginate } from '@widget/paginate/paginate.model';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzStepsModule } from 'ng-zorro-antd/steps';
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
    RouterLink,
    NzTableModule,
    NzButtonModule,
    NzModalModule,
    NzInputModule,
    NzSelectModule,
    NzStepsModule,
    StatusChipComponent,
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

  // Modal Import CSV CTĐT 3 bước (Chọn tệp -> Kiểm tra -> Lưu và xác nhận)
  readonly isImportModalVisible = signal(false);
  readonly importStep = signal(0);
  readonly importVersion = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly isImporting = signal(false);
  readonly importResult = signal<IProgramCsvImportResponse | null>(null);

  ngOnInit(): void {
    this.userRoles.set(this.authSvc.getRoles());
    this.loadPrograms();
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

  openImportModal(): void {
    this.importStep.set(0);
    this.importVersion.set('');
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.isImportModalVisible.set(true);
  }

  closeImportModal(): void {
    this.isImportModalVisible.set(false);
  }

  downloadImportTemplate(): void {
    this.versionSvc.downloadImportTemplate().subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'program-version-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.alert.error('Không thể tải tệp CSV mẫu');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  submitImportCheck(): void {
    const ver = this.importVersion().trim();
    const file = this.selectedFile();
    if (!ver || !file) {
      this.alert.warning('Vui lòng nhập tên phiên bản và chọn tệp CSV');
      return;
    }
    this.isImporting.set(true);
    this.versionSvc.importProgramCsv(this.selectedProgramId(), ver, file).subscribe({
      next: res => {
        this.isImporting.set(false);
        this.importResult.set(res);
        this.importStep.set(1);
      },
      error: err => {
        this.isImporting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Kiểm tra tệp CSV thất bại');
      },
    });
  }

  confirmImportSave(): void {
    const pvId = this.importResult()?.programVersionId;
    if (!pvId) {
      return;
    }
    this.isImporting.set(true);
    this.versionSvc.confirmImport(pvId).subscribe({
      next: res => {
        this.isImporting.set(false);
        this.importResult.set(res);
        this.importStep.set(2);
        this.alert.success(`Đã lưu và xác nhận import phiên bản [${res.version}]`);
        this.loadVersions();
      },
      error: err => {
        this.isImporting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Xác nhận import thất bại');
      },
    });
  }

  confirmActivateVersion(version: IProgramVersion): void {
    if (!this.canManage()) {
      this.alert.error('Chỉ Trưởng chương trình đào tạo mới có quyền phê duyệt đưa phiên bản CTĐT vào áp dụng.');
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
