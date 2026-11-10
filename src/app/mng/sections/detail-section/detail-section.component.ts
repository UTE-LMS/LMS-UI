import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ENROLLMENT_STATUS_DISPLAY, SECTION_STATUS_DISPLAY, SYLLABUS_STATUS_DISPLAY, TERM_STATUS_DISPLAY,
} from '@constants/academic-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IUserError } from '@models/common/user-error.model';
import { ICourse } from '@models/course/course.model';
import {
  EnrollmentStatus, IEnrollment, IEnrollmentList, ISection, SectionStatus,
} from '@models/course/section.model';
import { ISyllabus } from '@models/course/syllabus.model';
import { ITerm } from '@models/course/term.model';
import { IUser } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { EnrollmentService } from '@services/course/enrollment.service';
import { SectionService } from '@services/course/section.service';
import { SyllabusService } from '@services/course/syllabus.service';
import { TermService } from '@services/course/term.service';
import { UserService } from '@services/user/user.service';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, of } from 'rxjs';
import { SectionModalComponent } from '../section-modal/section-modal.component';
import { lecturerLabel } from '../sections.util';

type RosterFilter = 'ALL' | EnrollmentStatus;

/**
 * Chi tiết lớp học phần (F05a US-19, US-20): thông tin lớp, mẫu số (số ghi danh do API đếm), danh sách ghi danh,
 * rút/ghi danh lại, đổi giảng viên và đổi trạng thái lớp. Ẩn nút theo vai trò chỉ để tiện dùng; backend quyết định.
 */
@Component({
  selector: 'app-detail-section',
  templateUrl: './detail-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, FormsModule, RouterLink, NzTableModule, NzButtonModule, NzModalModule, NzSelectModule,
    DisplayChipComponent, ErrorStateComponent, TestDataFlagComponent, SectionModalComponent,
  ],
})
export class DetailSectionComponent implements OnInit {
  private readonly sectionSvc = inject(SectionService);
  private readonly enrollmentSvc = inject(EnrollmentService);
  private readonly termSvc = inject(TermService);
  private readonly courseSvc = inject(CourseService);
  private readonly syllabusSvc = inject(SyllabusService);
  private readonly userSvc = inject(UserService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);

  /** Gắn từ tham số route `:sectionId` (withComponentInputBinding). */
  readonly sectionId = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly sectionStatusDisplay = SECTION_STATUS_DISPLAY;
  protected readonly termStatusDisplay = TERM_STATUS_DISPLAY;
  protected readonly syllabusStatusDisplay = SYLLABUS_STATUS_DISPLAY;
  protected readonly enrollmentStatusDisplay = ENROLLMENT_STATUS_DISPLAY;
  protected readonly statusOptions: { value: SectionStatus; label: string; }[] = [
    { value: 'OPEN', label: 'Đang mở' },
    { value: 'CLOSED', label: 'Đã đóng' },
    { value: 'LOCKED', label: 'Đã khóa sổ điểm' },
  ];

  readonly roles = signal<string[]>([]);
  readonly currentUserId = signal('');
  readonly section = signal<ISection | null>(null);
  readonly term = signal<ITerm | null>(null);
  readonly course = signal<ICourse | null>(null);
  readonly syllabus = signal<ISyllabus | null>(null);
  readonly roster = signal<IEnrollmentList | null>(null);
  readonly users = signal<IUser[]>([]);

  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly busyEnrollmentId = signal<string | null>(null);

  readonly rosterFilter = signal<RosterFilter>('ALL');

  readonly isLecturersModalVisible = signal(false);
  readonly isStatusModalVisible = signal(false);
  readonly targetStatus = signal<SectionStatus>('OPEN');
  readonly statusReason = signal('');
  readonly isChangingStatus = signal(false);
  readonly statusError = signal<string | null>(null);

  readonly isAdmin = computed(() => this.roles().includes(SystemConstant.ROLE.ADMIN));

  /** Chỉ để ẩn nút: ADMIN hoặc PROGRAM_MANAGER quản lý lớp (backend kiểm tra phạm vi CTĐT, D1). */
  readonly canManage = computed(() => this.isAdmin() || this.roles().includes(SystemConstant.ROLE.PROGRAM_MANAGER));

  /** Chỉ để ẩn nút: ADMIN hoặc giảng viên của lớp thao tác danh sách ghi danh (backend: canAccessSection WRITE). */
  readonly canEditRoster = computed(() => {
    const section = this.section();
    if (!section) {
      return false;
    }
    return this.isAdmin()
      || (this.roles().includes(SystemConstant.ROLE.LECTURER) && section.lecturerIds.includes(this.currentUserId()));
  });

  /**
   * Danh sách ghi danh là mẫu số của tỷ lệ đạt nên bị đóng băng khi lớp hoặc học kỳ không còn OPEN (D6).
   * Trả về lý do để giải thích vì sao nút bị vô hiệu hóa; null nghĩa là sửa được (backend vẫn kiểm tra lại).
   */
  readonly frozenReason = computed<string | null>(() => {
    const section = this.section();
    const term = this.term();
    if (!section) {
      return null;
    }
    if (section.status !== 'OPEN') {
      return `Lớp đang ở trạng thái "${SECTION_STATUS_DISPLAY[section.status].label}" nên danh sách ghi danh (mẫu số của tỷ lệ đạt) bị đóng băng.`;
    }
    if (term && term.status !== 'OPEN') {
      return `Học kỳ ${term.code} đang ở trạng thái "${TERM_STATUS_DISPLAY[term.status].label}" nên danh sách ghi danh (mẫu số của tỷ lệ đạt) bị đóng băng.`;
    }
    return null;
  });

  /** Chưa có bản ghi ghi danh nào: khác với lớp có sinh viên nhưng tất cả đã rút. */
  readonly hasNoRoster = computed(() => (this.roster()?.enrollments.length ?? 0) === 0);

  readonly visibleEnrollments = computed<IEnrollment[]>(() => {
    const filter = this.rosterFilter();
    const all = this.roster()?.enrollments ?? [];
    return filter === 'ALL' ? all : all.filter(e => e.status === filter);
  });

  readonly lecturerNames = computed<ReadonlyMap<string, string>>(
    () => new Map(this.users().map(user => [user.id, user.username])),
  );

  readonly lecturerOptions = computed(() => this.users().filter(user => user.status === 'ACTIVE' && user.roleAssignments.some(a => a.role === SystemConstant.ROLE.LECTURER)));

  readonly lecturerListAvailable = computed(() => this.isAdmin() && this.users().length > 0);

  readonly lecturersText = computed(() => (this.section()?.lecturerIds ?? [])
    .map(id => lecturerLabel(id, this.lecturerNames(), this.currentUserId())).join(', '));

  readonly needsReason = computed(() => this.section()?.status === 'LOCKED' && this.targetStatus() !== 'LOCKED');

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.currentUserId.set(this.authSvc.getUserId());
    if (this.isAdmin()) {
      this.userSvc.filter(0, 100).pipe(catchError(() => of(null)))
        .subscribe(page => this.users.set(page?.content ?? []));
    }
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.actionError.set(null);
    const id = this.sectionId();
    this.sectionSvc.getSection(id).subscribe({
      next: section => {
        this.section.set(section);
        this.loadReferences(section);
        this.loadRoster();
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  private loadReferences(section: ISection): void {
    this.termSvc.getTermById(section.termId).pipe(catchError(() => of(null))).subscribe(t => this.term.set(t));
    this.courseSvc.getCourseById(section.courseId).pipe(catchError(() => of(null))).subscribe(c => this.course.set(c));
    this.syllabusSvc.getSyllabusById(section.syllabusId).pipe(catchError(() => of(null))).subscribe(s => this.syllabus.set(s));
  }

  private loadRoster(): void {
    this.enrollmentSvc.getEnrollments(this.sectionId()).subscribe({
      next: list => {
        this.roster.set(list);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  /** Rút khỏi lớp hoặc ghi danh lại một sinh viên (US-20/AC-4). Số đếm lấy lại từ API, UI không tự cộng trừ. */
  changeEnrollment(enrollment: IEnrollment, status: EnrollmentStatus): void {
    this.busyEnrollmentId.set(enrollment.id);
    this.actionError.set(null);
    this.enrollmentSvc.updateStatus(enrollment.id, status).subscribe({
      next: () => {
        this.busyEnrollmentId.set(null);
        this.alert.success(status === 'WITHDRAWN' ? `Đã rút ${enrollment.studentRef} khỏi lớp` : `Đã ghi danh lại ${enrollment.studentRef}`);
        this.loadRoster();
        this.refreshSection();
      },
      error: err => {
        this.busyEnrollmentId.set(null);
        this.actionError.set(toUserError(err).message);
      },
    });
  }

  openStatusModal(): void {
    const section = this.section();
    if (!section) {
      return;
    }
    this.targetStatus.set(section.status);
    this.statusReason.set('');
    this.statusError.set(null);
    this.isStatusModalVisible.set(true);
  }

  submitStatus(): void {
    const section = this.section();
    if (!section) {
      return;
    }
    const reason = this.statusReason().trim();
    if (this.needsReason() && !reason) {
      this.statusError.set('Cần nhập lý do giải trình khi mở lại lớp đã khóa sổ điểm.');
      return;
    }
    this.isChangingStatus.set(true);
    this.statusError.set(null);
    this.sectionSvc.updateStatus(section.id, {
      status: this.targetStatus(),
      ...(reason ? { reason } : {}),
    }).subscribe({
      next: updated => {
        this.isChangingStatus.set(false);
        this.isStatusModalVisible.set(false);
        this.section.set(updated);
        this.alert.success('Đã cập nhật trạng thái lớp');
      },
      error: err => {
        this.isChangingStatus.set(false);
        this.statusError.set(toUserError(err).message);
      },
    });
  }

  onLecturersSaved(updated: ISection): void {
    this.section.set(updated);
  }

  private refreshSection(): void {
    this.sectionSvc.getSection(this.sectionId()).pipe(catchError(() => of(null))).subscribe(section => {
      if (section) {
        this.section.set(section);
      }
    });
  }
}
