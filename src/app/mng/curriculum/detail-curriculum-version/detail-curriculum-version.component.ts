import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IPi, IPlo, IProgramCourse } from '@models/program/plo-pi.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { CloPiMatrixTableComponent } from './clo-pi-matrix-table/clo-pi-matrix-table.component';
import { ProgramCoursesTableComponent } from './program-courses-table/program-courses-table.component';

export interface ITreeRow {
  id: string;
  isPlo: boolean;
  code: string;
  categoryLabel?: string;
  piCount?: number;
  content: string;
  original?: string;
  capabilityLevel?: number;
  sourceLabel?: string;
  targetPassRate?: number;
}

@Component({
  selector: 'app-detail-curriculum-version',
  templateUrl: './detail-curriculum-version.component.html',
  styleUrl: './detail-curriculum-version.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NzTableModule,
    NzButtonModule,
    StatusChipComponent,
    ProgramCoursesTableComponent,
    CloPiMatrixTableComponent,
  ],
})
export class DetailCurriculumVersionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly versionSvc = inject(ProgramVersionService);
  private readonly ploPiSvc = inject(PloPiService);
  private readonly authSvc = inject(AuthService, { optional: true });
  private readonly alert = inject(ToastrService);
  private readonly modal = inject(NzModalService, { optional: true });

  readonly versionId = signal<string>('');
  readonly version = signal<IProgramVersion | null>(null);

  readonly plos = signal<IPlo[]>([]);
  readonly pis = signal<IPi[]>([]);
  readonly courses = signal<IProgramCourse[]>([]);
  readonly coursesTotal = signal(0);

  readonly isLoading = signal(false);
  readonly userRoles = signal<string[]>([]);
  readonly activeTab = signal<'PLO_PI' | 'PROGRAM_COURSES' | 'CLO_PI_MATRIX'>('PLO_PI');
  readonly selectedMatrixCourseId = signal<string | null>(null);

  readonly canManage = computed(() => {
    const roles = this.userRoles();
    if (!roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)) {
      return false;
    }
    const pmFacultyId = this.authSvc?.getFacultyId?.();
    const progFacultyId = this.version()?.facultyId;
    if (pmFacultyId && progFacultyId) {
      return pmFacultyId === progFacultyId;
    }
    return Boolean(pmFacultyId);
  });

  readonly canImportProgramCourses = computed(() => (
    this.version()?.status === 'ACTIVE' && this.canManage()
  ));

  private readonly ploCategoryLabels: Record<string, string> = {
    GENERAL: 'Kiến thức chung',
    SPECIALIZED: 'Chuyên ngành',
  };

  /**
   * Bất biến nghiệp vụ: PLO phải được sắp theo displayOrder quy định của Khoa
   * (Ví dụ: PLO1, PLO6, PLO7, PLO4, PLO5, PLO2, PLO3), KHÔNG sắp theo mã chuỗi hay thời gian chèn.
   */
  readonly sortedPlos = computed(() => {
    const list = [...this.plos()];
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  });

  /** Cấu trúc cây PLO & PI phục vụ bảng hiển thị */
  readonly treeRows = computed<ITreeRow[]>(() => {
    const rows: ITreeRow[] = [];
    const plosList = this.sortedPlos();
    const allPis = this.pis();

    plosList.forEach(plo => {
      // Các PI con trực thuộc PLO sắp theo displayOrder
      const subPis = allPis
        .filter(pi => pi.ploId === plo.id)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      // Dòng PLO cha
      rows.push({
        id: plo.id,
        isPlo: true,
        code: plo.code,
        categoryLabel: plo.category ? this.ploCategoryLabels[plo.category] : undefined,
        piCount: subPis.length,
        content: plo.contentSummary ?? plo.contentOriginal ?? '',
        original: plo.contentOriginal,
        capabilityLevel: plo.capabilityLevelRaw,
        sourceLabel: plo.contentOriginal ? 'Đã đối chiếu bản gốc' : 'Diễn giải tạm',
      });

      subPis.forEach(pi => {
        rows.push({
          id: pi.id,
          isPlo: false,
          code: pi.code,
          content: pi.contentShort ?? pi.contentOriginal ?? '',
          capabilityLevel: pi.capabilityLevelRaw,
          targetPassRate: pi.targetPassRate,
        });
      });
    });

    return rows;
  });

  ngOnInit(): void {
    this.userRoles.set(this.authSvc?.getRoles?.() ?? []);
    const id = this.route.snapshot.paramMap.get('versionId');
    if (id) {
      this.versionId.set(id);
      this.loadData();
    }
  }

  confirmLockVersion(): void {
    const ver = this.version();
    if (!ver || !this.canManage() || ver.status !== 'ACTIVE') {
      return;
    }

    this.modal?.confirm({
      nzTitle: 'Khóa phiên bản chương trình đào tạo',
      nzContent: `Bạn có chắc chắn muốn khóa phiên bản CTĐT [${ver.version}]? Sau khi khóa, phiên bản sẽ chuyển sang trạng thái Đã lưu trữ, ngăn chặn hoàn toàn việc nhập điểm, sửa đổi đề cương và các cấu hình liên quan.`,
      nzOkText: 'Khóa phiên bản',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.versionSvc.lockProgramVersion(ver.id).subscribe({
          next: updated => {
            this.version.set(updated);
            this.alert.success(`Phiên bản [${ver.version}] đã được khóa thành công`);
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể khóa phiên bản CTĐT');
          },
        });
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

  loadData(): void {
    const vId = this.versionId();
    if (!vId) {
      return;
    }

    this.isLoading.set(true);
    this.versionSvc.getProgramVersionById(vId).subscribe({
      next: ver => {
        this.version.set(ver);

        // Tải đồng thời PLO, PI, Courses
        forkJoin({
          plos: this.ploPiSvc.getPlos(vId),
          pis: this.ploPiSvc.getPis(vId),
          courses: this.ploPiSvc.getProgramCourses(vId, 0, 20),
        }).subscribe({
          next: res => {
            this.isLoading.set(false);
            this.plos.set(res.plos || []);
            this.pis.set(res.pis || []);
            const courseList = res.courses?.content ?? [];
            this.courses.set(courseList);
            this.coursesTotal.set(res.courses?.totalElements ?? courseList.length);
          },
          error: err => {
            this.isLoading.set(false);
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể tải dữ liệu PLO/PI');
          },
        });
      },
      error: err => {
        this.isLoading.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không tìm thấy phiên bản CTĐT');
      },
    });
  }

  getPisOfPlo(ploId: string): IPi[] {
    return this.pis()
      .filter(pi => pi.ploId === ploId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  switchTab(tab: 'PLO_PI' | 'PROGRAM_COURSES' | 'CLO_PI_MATRIX'): void {
    this.activeTab.set(tab);
  }

  openCloPiMatrixForCourse(courseId: string): void {
    this.selectedMatrixCourseId.set(courseId);
    this.activeTab.set('CLO_PI_MATRIX');
  }
}
