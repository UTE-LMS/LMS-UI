import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SystemConstant } from '@constants/system.constant';
import { IRoleAssignment } from '@models/user/user.model';
import {
  ICoursePiContribution,
  IPi,
  IPlo,
  IProgramCourse,
  PiContributionType,
} from '@models/program/plo-pi.model';
import { IProgram } from '@models/program/program.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { PloPiService } from '@services/program/plo-pi.service';
import { ProgramVersionService } from '@services/program/program-version.service';
import { ProgramService } from '@services/program/program.service';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { VerificationBadgeComponent } from '@widget/verification-badge/verification-badge.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { VerificationActionModalComponent } from './verification-action-modal/verification-action-modal.component';

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

export interface ICoursePiContribBadge {
  piCode: string;
  contribution: PiContributionType;
}

@Component({
  selector: 'app-detail-curriculum-version',
  templateUrl: './detail-curriculum-version.component.html',
  styleUrl: './detail-curriculum-version.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    NzTableModule,
    NzButtonModule,
    StatusChipComponent,
    VerificationBadgeComponent,
    VerificationActionModalComponent,
  ],
})
export class DetailCurriculumVersionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly versionSvc = inject(ProgramVersionService);
  private readonly programSvc = inject(ProgramService);
  private readonly ploPiSvc = inject(PloPiService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);

  readonly versionId = signal<string>('');
  readonly version = signal<IProgramVersion | null>(null);
  readonly program = signal<IProgram | null>(null);

  readonly plos = signal<IPlo[]>([]);
  readonly pis = signal<IPi[]>([]);
  readonly contributions = signal<ICoursePiContribution[]>([]);
  readonly courses = signal<IProgramCourse[]>([]);

  readonly isLoading = signal(false);
  readonly isVerifyModalVisible = signal(false);
  readonly userRoles = signal<string[]>([]);

  private readonly ploCategoryLabels: Record<string, string> = {
    GENERAL: 'Đại cương',
    SPECIALIZED: 'Chuyên ngành',
  };

  /** Kiểm tra vai trò QA_OFFICER (ADR 0004: chỉ QA_OFFICER mới có quyền duyệt ĐBCL) */
  readonly isQaOfficer = computed(() => {
    return this.userRoles().includes(SystemConstant.ROLE.QA_OFFICER);
  });

  /** Kiểm tra quyền sửa ma trận I/R/M & chỉnh sửa chương trình (ADR 0005: chỉ PROGRAM_MANAGER trong scope, ADMIN không có quyền sửa) */
  readonly canEdit = computed(() => {
    const roles = this.userRoles();
    const ver = this.version();
    // Nếu phiên bản đã ARCHIVED thì không thể sửa ma trận
    if (ver?.status === 'ARCHIVED') {
      return false;
    }
    if (!roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)) {
      return false;
    }
    const assignments = this.authSvc.getRoleAssignments();
    const pmAssignment = assignments.find(
      (r: IRoleAssignment) => r.role === SystemConstant.ROLE.PROGRAM_MANAGER,
    );
    const scopeProgramIds = pmAssignment?.scope?.programIds ?? [];
    if (!scopeProgramIds.length) {
      return true;
    }
    const progId = ver?.programId;
    return !!progId && scopeProgramIds.includes(progId);
  });

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
    this.userRoles.set(this.authSvc.getRoles());
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

  getCourseContributions(courseId: string): ICoursePiContribBadge[] {
    const piMap = new Map(this.pis().map(p => [p.id, p.code]));
    return this.contributions()
      .filter(c => c.courseId === courseId)
      .map(c => ({
        piCode: piMap.get(c.piId) ?? c.piId,
        contribution: c.contribution,
      }));
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

        // Tải đồng thời PLO, PI, Contributions, Courses
        forkJoin({
          plos: this.ploPiSvc.getPlos(vId),
          pis: this.ploPiSvc.getPis(vId),
          contributions: this.ploPiSvc.getContributions(vId),
          courses: this.ploPiSvc.getProgramCourses(vId),
        }).subscribe({
          next: res => {
            this.isLoading.set(false);
            this.plos.set(res.plos || []);
            this.pis.set(res.pis || []);
            this.contributions.set(res.contributions || []);
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

  getContribution(courseId: string, piId: string): ICoursePiContribution | undefined {
    return this.contributions().find(c => c.courseId === courseId && c.piId === piId);
  }

  /**
   * Chuyển đổi trạng thái đóng góp trong ma trận: Trống -> I -> R -> M -> Xóa (về Trống)
   */
  onCellClick(courseId: string, piId: string): void {
    if (!this.canEdit()) {
      return;
    }

    const current = this.getContribution(courseId, piId);
    const vId = this.versionId();

    if (!current) {
      // Trống -> I
      this.ploPiSvc
        .createContribution(vId, { courseId, piId, contribution: 'I' })
        .subscribe({
          next: created => {
            this.contributions.update(list => [...list, created]);
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể cập nhật đóng góp I/R/M');
          },
        });
    } else if (current.contribution === 'I') {
      // I -> R: xóa bản ghi cũ rồi tạo 'R'
      this.cycleContribution(current, 'R');
    } else if (current.contribution === 'R') {
      // R -> M
      this.cycleContribution(current, 'M');
    } else {
      // M -> Xóa (về Trống)
      this.ploPiSvc.deleteContribution(vId, current.id).subscribe({
        next: () => {
          this.contributions.update(list => list.filter(c => c.id !== current.id));
        },
        error: err => {
          const apiErr = toApiError(err);
          this.alert.error(apiErr?.message ?? 'Không thể xóa đóng góp I/R/M');
        },
      });
    }
  }

  private cycleContribution(oldContrib: ICoursePiContribution, nextType: PiContributionType): void {
    const vId = this.versionId();
    this.ploPiSvc.deleteContribution(vId, oldContrib.id).subscribe({
      next: () => {
        this.ploPiSvc
          .createContribution(vId, {
            courseId: oldContrib.courseId,
            piId: oldContrib.piId,
            contribution: nextType,
          })
          .subscribe({
            next: created => {
              this.contributions.update(list => [
                ...list.filter(c => c.id !== oldContrib.id),
                created,
              ]);
            },
            error: err => {
              const apiErr = toApiError(err);
              this.alert.error(apiErr?.message ?? 'Không thể cập nhật đóng góp I/R/M');
            },
          });
      },
      error: err => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể cập nhật đóng góp I/R/M');
      },
    });
  }

  openVerifyModal(): void {
    this.isVerifyModalVisible.set(true);
  }
}
