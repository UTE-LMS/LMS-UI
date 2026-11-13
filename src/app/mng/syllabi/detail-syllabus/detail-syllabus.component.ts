import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IClo } from '@models/course/clo.model';
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
import { NzButtonModule } from 'ng-zorro-antd/button';
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
  private readonly termSvc = inject(TermService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);

  readonly syllabusId = signal<string>('');
  readonly syllabus = signal<ISyllabus | null>(null);
  readonly course = signal<ICourse | null>(null);
  readonly clos = signal<IClo[]>([]);
  readonly terms = signal<ITerm[]>([]);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly userRoles = signal<string[]>([]);
  readonly scopeCourseIds = signal<string[]>([]);
  readonly scopeProgramIds = signal<string[]>([]);

  readonly isAdmin = computed(() => this.userRoles().includes(SystemConstant.ROLE.ADMIN));

  readonly isCourseInScope = computed(() => {
    const cid = this.syllabus()?.courseId;
    return !!cid && (this.scopeCourseIds().includes(cid) || this.scopeProgramIds().length > 0);
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
    const assignments = this.authSvc.getRoleAssignments();
    const courseIds = new Set<string>();
    const programIds = new Set<string>();
    assignments.forEach((a: IRoleAssignment) => {
      (a.scope?.courseIds ?? []).forEach(id => courseIds.add(id));
      (a.scope?.programIds ?? []).forEach(id => programIds.add(id));
    });
    this.scopeCourseIds.set(Array.from(courseIds));
    this.scopeProgramIds.set(Array.from(programIds));

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
}
