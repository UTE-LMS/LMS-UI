import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IPi, IPlo, IProgramCourse } from '@models/program/plo-pi.model';
import { IProgram } from '@models/program/program.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { toApiError } from '@services/common/api-error.util';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ProgramService } from '@services/program/program.service';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
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
  private readonly programSvc = inject(ProgramService);
  private readonly ploPiSvc = inject(PloPiService);
  private readonly alert = inject(ToastrService);

  readonly versionId = signal<string>('');
  readonly version = signal<IProgramVersion | null>(null);
  readonly program = signal<IProgram | null>(null);

  readonly plos = signal<IPlo[]>([]);
  readonly pis = signal<IPi[]>([]);
  readonly courses = signal<IProgramCourse[]>([]);

  readonly isLoading = signal(false);
  readonly userRoles = signal<string[]>([]);
  readonly activeTab = signal<'PLO_PI' | 'PROGRAM_COURSES' | 'CLO_PI_MATRIX'>('PLO_PI');
  readonly selectedMatrixCourseId = signal<string | null>(null);

  private readonly ploCategoryLabels: Record<string, string> = {
    GENERAL: 'Đại cương',
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
    const id = this.route.snapshot.paramMap.get('versionId');
    if (id) {
      this.versionId.set(id);
      this.loadData();
    }
  }

  formatCohorts(cohorts?: string[]): string {
    if (!cohorts || cohorts.length === 0) {
      return '—';
    }
    return cohorts.join(', ');
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
        // Tải thông tin CTĐT gốc
        this.programSvc.getProgramById(ver.programId).subscribe({
          next: prog => this.program.set(prog),
          error: () => undefined,
        });

        // Tải đồng thời PLO, PI, Courses
        forkJoin({
          plos: this.ploPiSvc.getPlos(vId),
          pis: this.ploPiSvc.getPis(vId),
          courses: this.ploPiSvc.getProgramCourses(vId),
        }).subscribe({
          next: res => {
            this.isLoading.set(false);
            this.plos.set(res.plos || []);
            this.pis.set(res.pis || []);
            this.courses.set(res.courses || []);
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
