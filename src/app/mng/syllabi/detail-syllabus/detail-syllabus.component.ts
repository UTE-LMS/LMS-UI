import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IClo, ICloPiLink } from '@models/course/clo.model';
import { ICourse } from '@models/course/course.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { IPi } from '@models/program/plo-pi.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CloService } from '@services/course/clo.service';
import { CourseService } from '@services/course/course.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { PloPiService } from '@services/program/plo-pi.service';
import { BloomLevelLabelComponent } from '@widget/level-label/bloom-level-label.component';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-detail-syllabus',
  templateUrl: './detail-syllabus.component.html',
  styleUrl: './detail-syllabus.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NzTableModule,
    NzButtonModule,
    StatusChipComponent,
    BloomLevelLabelComponent,
  ],
})
export class DetailSyllabusComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly courseSvc = inject(CourseService);
  private readonly cloSvc = inject(CloService);
  private readonly ploPiSvc = inject(PloPiService, { optional: true });
  private readonly termSvc = inject(TermService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);
  private readonly modal = inject(NzModalService, { optional: true });

  readonly syllabusId = signal<string>('');
  readonly syllabus = signal<ISyllabus | null>(null);
  readonly course = signal<ICourse | null>(null);
  readonly clos = signal<IClo[]>([]);
  readonly cloPiLinks = signal<ICloPiLink[]>([]);
  readonly pis = signal<IPi[]>([]);
  readonly terms = signal<ITerm[]>([]);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly userRoles = signal<string[]>([]);

  readonly isAdmin = computed(() => this.userRoles().includes(SystemConstant.ROLE.ADMIN));

  readonly isActiveOrConfirmed = computed(() => {
    const st = this.syllabus()?.status as string | undefined;
    return st === 'ACTIVE' || st === 'CONFIRMED';
  });

  readonly isCourseInScope = computed(() => {
    const cid = this.syllabus()?.courseId;
    if (!cid || !this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER)) {
      return false;
    }
    const pmFacId = this.authSvc.getFacultyId?.();
    const courseFacId = this.course()?.facultyId;
    if (pmFacId && courseFacId) {
      return pmFacId === courseFacId;
    }
    return Boolean(pmFacId);
  });

  /**
   * Quyền Khóa đề cương chuyển sang Lưu trữ (ARCHIVED):
   * Chỉ duy nhất PROGRAM_MANAGER có môn học trong scope và đề cương đang ACTIVE / CONFIRMED.
   * QA, ADMIN và LECTURER hoàn toàn chỉ đọc (Read-only).
   */
  readonly canLockSyllabus = computed(() => {
    if (this.isAdmin() || !this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER)) {
      return false;
    }
    if (!this.isCourseInScope()) {
      return false;
    }
    return this.isActiveOrConfirmed();
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

  ngOnInit(): void {
    this.userRoles.set(this.authSvc.getRoles());

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
        this.cloSvc.getCloPiLinks?.(id).subscribe({
          next: links => {
            const safeLinks = links || [];
            this.cloPiLinks.set(safeLinks);
            const pvIds = Array.from(new Set(safeLinks.map(l => l.programVersionId).filter(Boolean)));
            if (pvIds.length > 0 && this.ploPiSvc) {
              this.ploPiSvc.getPis(pvIds[0]).subscribe({
                next: piList => this.pis.set(piList || []),
                error: () => undefined,
              });
            }
          },
          error: () => this.cloPiLinks.set([]),
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
    const term = this.terms().find(t => t.id === termId || t.code === termId);
    if (!term) {
      return termId;
    }
    return term.academicYear ? `${term.code} (${term.academicYear})` : term.code;
  }

  getLinksForClo(cloId: string): ICloPiLink[] {
    return this.cloPiLinks().filter(l => l.cloId === cloId);
  }

  getPiCode(piId: string): string {
    return this.pis().find(p => p.id === piId)?.code ?? piId;
  }

  formatWeight(val?: number | null): string {
    if (val === null || val === undefined) {
      return '—';
    }
    return String(val);
  }

  formatRatio(val?: number | null): string {
    if (val === null || val === undefined) {
      return '—';
    }
    return `${Math.round(val * 10000) / 100}% (${val})`;
  }

  confirmLockSyllabus(): void {
    const syl = this.syllabus();
    if (!syl || !this.canLockSyllabus()) {
      return;
    }

    this.modal?.confirm({
      nzTitle: 'Khóa phiên bản đề cương học phần',
      nzContent: `Bạn có chắc chắn muốn khóa phiên bản đề cương [${syl.version}]? Sau khi khóa, đề cương sẽ chuyển sang trạng thái Lưu trữ, ngăn chặn hoàn toàn việc nhập điểm và không thể chỉnh sửa.`,
      nzOkText: 'Khóa đề cương',
      nzOkDanger: true,
      nzOnOk: () => {
        this.syllabusSvc.lockSyllabus(syl.id).subscribe({
          next: updated => {
            this.syllabus.set(updated);
            this.alert.success(`Phiên bản đề cương [${syl.version}] đã được khóa.`);
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể khóa phiên bản đề cương');
          },
        });
      },
    });
  }
}
