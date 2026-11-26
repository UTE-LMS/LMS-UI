import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IProgramCourseCsvImportResponse } from '@models/course/course.model';
import { IProgram } from '@models/program/program.model';
import {
  IProgramCsvImportResponse,
  IProgramVersion,
} from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
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
import { ImportTemplateFormat, saveBlobAs, templateFileNameFor } from '@services/common/import-file.util';
import { ImportFilePreviewComponent } from '@widget/import-file-preview/import-file-preview.component';

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
    ImportFilePreviewComponent,
  ],
})
export class ListCurriculumVersionsComponent implements OnInit {
  private readonly programSvc = inject(ProgramService);
  private readonly versionSvc = inject(ProgramVersionService);
  private readonly courseSvc = inject(CourseService);
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

  /** Kiểm tra quyền ghi: chỉ PROGRAM_MANAGER có quyền trong scope Khoa (M4 Decentralization) */
  readonly canManage = computed(() => {
    const roles = this.userRoles();
    if (!roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)) {
      return false;
    }
    const pmFacultyId = this.authSvc.getFacultyId?.();
    const progFacultyId = this.selectedProgram()?.facultyId;
    if (pmFacultyId && progFacultyId) {
      return pmFacultyId === progFacultyId;
    }
    return Boolean(pmFacultyId);
  });

  // Modal Import CSV CTĐT 3 bước (Chọn tệp & Phiên bản -> Xem trước & Xác nhận PLO/PI -> Khung học phần)
  readonly isImportModalVisible = signal(false);
  readonly importStep = signal<0 | 1 | 2>(0);
  readonly importVersion = signal('');
  readonly importApplicableCohort = signal('');
  readonly importDurationYears = signal<number | null>(null);
  readonly importTotalCredits = signal<number | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly isImporting = signal(false);
  readonly importResult = signal<IProgramCsvImportResponse | null>(null);
  readonly createdProgramVersionId = signal<string>('');
  readonly selectedCoursesFile = signal<File | null>(null);
  readonly isImportingCourses = signal(false);
  readonly coursesImportResult = signal<IProgramCourseCsvImportResponse | null>(null);

  /** Danh sách dòng dữ liệu xem trước trích xuất từ PLO và PI trong phản hồi preview CSV */
  readonly previewRows = computed(() => {
    const res = this.importResult();
    if (!res) {
      return [];
    }
    const rows: {
      code: string;
      typeLabel: string;
      capabilityLevel?: number;
      credits?: number;
      content: string;
    }[] = [];

    (res.plos || []).forEach(raw => {
      const item = raw as Record<string, unknown>;
      const rawContent = item['contentSummary'] ?? item['contentOriginal'] ?? item['content'];
      rows.push({
        code: typeof item['code'] === 'string' ? item['code'] : '—',
        typeLabel: 'PLO',
        capabilityLevel:
          typeof item['capabilityLevel'] === 'number'
            ? item['capabilityLevel']
            : typeof item['capabilityLevelRaw'] === 'number'
              ? item['capabilityLevelRaw']
              : undefined,
        content: typeof rawContent === 'string' ? rawContent : '—',
      });
    });

    (res.pis || []).forEach(raw => {
      const item = raw as Record<string, unknown>;
      const rawContent = item['contentShort'] ?? item['contentOriginal'] ?? item['content'];
      rows.push({
        code: typeof item['code'] === 'string' ? item['code'] : '—',
        typeLabel: 'PI',
        capabilityLevel:
          typeof item['capabilityLevel'] === 'number'
            ? item['capabilityLevel']
            : typeof item['capabilityLevelRaw'] === 'number'
              ? item['capabilityLevelRaw']
              : undefined,
        content: typeof rawContent === 'string' ? rawContent : '—',
      });
    });

    return rows;
  });

  ngOnInit(): void {
    this.userRoles.set(this.authSvc.getRoles());
    this.loadPrograms();
  }

  loadPrograms(): void {
    const roles = this.userRoles();
    const isPmOnly =
      roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)
      && !roles.includes(SystemConstant.ROLE.ADMIN);
    const facultyId = isPmOnly ? this.authSvc.getFacultyId?.() : undefined;
    const req$ = facultyId
      ? this.programSvc.getPrograms(0, 100, facultyId)
      : this.programSvc.getPrograms(0, 100);

    req$.subscribe({
      next: res => {
        const list = res.content || [];
        this.programs.set(list);

        // Lấy param từ query params nếu có
        const queryProgId = this.route.snapshot.queryParamMap.get('programId');
        if (queryProgId && list.some(p => p.id === queryProgId)) {
          this.selectedProgramId.set(queryProgId);
        } else if (list.length > 0) {
          this.selectedProgramId.set(list[0].id);
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
        },
        error: err => {
          this.isLoading.set(false);
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể tải danh sách phiên bản');
        },
      });
  }

  formatCohorts(cohort?: string): string {
    const trimmed = cohort?.trim();
    if (!trimmed) {
      return '—';
    }
    return trimmed;
  }

  onPageChange(config: Paginate<IProgramVersion>): void {
    this.page.set(config.currentPage);
    this.size.set(config.limit);
    this.loadVersions();
  }

  openImportModal(): void {
    this.importStep.set(0);
    this.importVersion.set('');
    this.importApplicableCohort.set('');
    this.importDurationYears.set(null);
    this.importTotalCredits.set(null);
    this.selectedFile.set(null);
    this.importResult.set(null);
    this.createdProgramVersionId.set('');
    this.selectedCoursesFile.set(null);
    this.isImportingCourses.set(false);
    this.coursesImportResult.set(null);
    this.isImportModalVisible.set(true);
  }

  closeImportModal(): void {
    this.isImportModalVisible.set(false);
  }

  downloadImportTemplate(format: ImportTemplateFormat = 'csv'): void {
    this.versionSvc.downloadImportTemplate(format).subscribe({
      next: blob => saveBlobAs(blob, templateFileNameFor('program-version-template.csv', format)),
      error: () => {
        this.alert.error('Không thể tải tệp mẫu');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  private buildImportMetadata(): {
    totalCredits: number | null;
    durationYears: number | null;
    applicableCohort: string | null;
  } {
    const rawCredits = this.importTotalCredits();
    const rawYears = this.importDurationYears();
    const totalCredits =
      rawCredits !== null && String(rawCredits).trim() !== '' && !Number.isNaN(Number(rawCredits))
        ? Number(rawCredits)
        : null;
    const durationYears =
      rawYears !== null && String(rawYears).trim() !== '' && !Number.isNaN(Number(rawYears))
        ? Number(rawYears)
        : null;
    const cleanCohort = this.importApplicableCohort().trim();
    return {
      totalCredits,
      durationYears,
      applicableCohort: cleanCohort || null,
    };
  }

  submitPreview(): void {
    const ver = this.importVersion().trim();
    const file = this.selectedFile();
    if (!ver || !file) {
      this.alert.warning('Vui lòng nhập tên phiên bản và chọn tệp CSV');
      return;
    }
    const metadata = this.buildImportMetadata();
    if (metadata.totalCredits !== null && metadata.totalCredits < 0) {
      this.alert.warning('Tổng tín chỉ không được âm');
      return;
    }
    if (metadata.durationYears !== null && metadata.durationYears < 0) {
      this.alert.warning('Thời gian đào tạo không được âm');
      return;
    }
    if (metadata.applicableCohort && metadata.applicableCohort.length > 50) {
      this.alert.warning('Khóa đào tạo tối đa 50 ký tự');
      return;
    }
    this.isImporting.set(true);
    this.versionSvc.previewImportProgramCsv(this.selectedProgramId(), ver, file, metadata).subscribe({
      next: res => {
        this.isImporting.set(false);
        this.importResult.set(res);
        this.importStep.set(1);
      },
      error: err => {
        this.isImporting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Xem trước tệp CSV thất bại');
      },
    });
  }

  submitImportCheck(): void {
    this.submitPreview();
  }

  confirmImport(): void {
    const ver = this.importVersion().trim();
    const file = this.selectedFile();
    if (!ver || !file) {
      return;
    }
    const metadata = this.buildImportMetadata();
    this.isImporting.set(true);
    this.versionSvc.importProgramCsv(this.selectedProgramId(), ver, file, metadata).subscribe({
      next: res => {
        this.isImporting.set(false);
        this.importResult.set(res);
        this.createdProgramVersionId.set(res.programVersionId);
        this.selectedCoursesFile.set(null);
        this.coursesImportResult.set(null);
        this.importStep.set(2);
        this.alert.success(
          `Đã import PLO/PI phiên bản CTĐT [${res.version}] (Đang áp dụng). Vui lòng tiếp tục import Khung học phần để hoàn tất.`,
        );
        this.loadVersions();
      },
      error: err => {
        this.isImporting.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Import phiên bản CTĐT thất bại');
      },
    });
  }

  confirmImportSave(): void {
    this.confirmImport();
  }

  downloadCoursesImportTemplate(format: ImportTemplateFormat = 'csv'): void {
    const pvId = this.createdProgramVersionId();
    if (!pvId) {
      return;
    }
    this.courseSvc.downloadProgramCoursesImportTemplate(pvId, format).subscribe({
      next: blob => saveBlobAs(blob, templateFileNameFor('program-courses-template.csv', format)),
      error: err => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Tải file mẫu khung học phần thất bại');
      },
    });
  }

  onCoursesFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedCoursesFile.set(file);
    this.coursesImportResult.set(null);
  }

  submitCoursesImport(): void {
    const pvId = this.createdProgramVersionId();
    const file = this.selectedCoursesFile();
    if (!pvId || !file) {
      this.alert.warning('Vui lòng chọn tệp khung học phần (.csv hoặc .xlsx)');
      return;
    }
    this.isImportingCourses.set(true);
    this.courseSvc.importProgramCoursesCsv(pvId, file).subscribe({
      next: res => {
        this.isImportingCourses.set(false);
        this.coursesImportResult.set(res);
        this.alert.success(
          `Đã import khung học phần: ${res.importedCount} thêm mới, ${res.updatedCount} cập nhật`,
        );
      },
      error: err => {
        this.isImportingCourses.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Import khung học phần thất bại');
      },
    });
  }

  finishImportModal(): void {
    this.isImportModalVisible.set(false);
  }

  confirmLockVersion(version: IProgramVersion): void {
    if (!this.canManage()) {
      this.alert.error('Bạn không có quyền khóa phiên bản chương trình đào tạo này.');
      return;
    }

    this.modal.confirm({
      nzTitle: 'Khóa phiên bản chương trình đào tạo',
      nzContent: `Bạn có chắc chắn muốn khóa phiên bản CTĐT [${version.version}]? Sau khi khóa, phiên bản sẽ chuyển sang trạng thái Đã lưu trữ, ngăn chặn hoàn toàn việc nhập điểm, sửa đổi đề cương và các cấu hình liên quan.`,
      nzOkText: 'Khóa phiên bản',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.versionSvc.lockProgramVersion(version.id).subscribe({
          next: () => {
            this.alert.success(`Phiên bản [${version.version}] đã được khóa thành công`);
            this.loadVersions();
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể khóa phiên bản CTĐT');
          },
        });
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
