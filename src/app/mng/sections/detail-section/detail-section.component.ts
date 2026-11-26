import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ENROLLMENT_STATUS_DISPLAY, SECTION_STATUS_DISPLAY, SYLLABUS_STATUS_DISPLAY,
} from '@constants/academic-display.constant';
import { SystemConstant } from '@constants/system.constant';
import { UrlConstant } from '@constants/url.constant';
import { IUserError } from '@models/common/user-error.model';
import {
  EnrollmentStatus, IEnrollment, IEnrollmentList, ISection, SectionStatus,
} from '@models/course/section.model';
import { IUser } from '@models/user/user.model';
import { AuthService } from '@services/auth/auth.service';
import { toUserError } from '@services/common/api-error.util';
import { EnrollmentService } from '@services/course/enrollment.service';
import { SectionService } from '@services/course/section.service';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { TestDataFlagComponent } from '@widget/test-data-flag/test-data-flag.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject } from 'rxjs';
import { SectionModalComponent } from '../section-modal/section-modal.component';
import { sectionLecturersText } from '../sections.util';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly sectionSvc = inject(SectionService);
  private readonly enrollmentSvc = inject(EnrollmentService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);

  /** Gắn từ tham số route `:sectionId` (withComponentInputBinding). */
  readonly sectionId = input.required<string>();

  protected readonly urlConst = UrlConstant.ROUTE.MANAGEMENT;
  protected readonly sectionStatusDisplay = SECTION_STATUS_DISPLAY;
  protected readonly syllabusStatusDisplay = SYLLABUS_STATUS_DISPLAY;
  protected readonly enrollmentStatusDisplay = ENROLLMENT_STATUS_DISPLAY;
  protected readonly statusOptions: { value: SectionStatus; label: string; }[] = [
    { value: 'OPEN', label: 'Đang mở' },
    { value: 'CLOSED', label: 'Đã đóng' },
    { value: 'LOCKED', label: 'Đã khóa sổ điểm' },
  ];

  readonly roles = signal<string[]>([]);
  readonly currentUserId = signal('');
  readonly currentUserName = signal('');
  readonly section = signal<ISection | null>(null);
  readonly roster = signal<IEnrollmentList | null>(null);
  readonly lecturers = signal<IUser[]>([]);
  readonly lecturerListAvailable = signal(false);

  readonly isLoading = signal(true);
  readonly loadError = signal<IUserError | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly busyEnrollmentId = signal<string | null>(null);

  readonly rosterFilter = signal<RosterFilter>('ALL');
  readonly rosterSearch = signal('');
  readonly rosterPage = signal(0);
  readonly rosterSize = signal(20);
  readonly rosterTotalElements = signal(0);
  readonly isLoadingRoster = signal(false);
  private readonly rosterSearchSubject$ = new Subject<string>();

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
    if (!section) {
      return null;
    }
    if (section.status !== 'OPEN') {
      return `Lớp đang ở trạng thái "${SECTION_STATUS_DISPLAY[section.status].label}" nên danh sách ghi danh (mẫu số của tỷ lệ đạt) bị đóng băng.`;
    }
    return null;
  });

  /** Chưa có bản ghi ghi danh nào toàn lớp: dùng mẫu số (enrolled + withdrawn) để không phụ thuộc bộ lọc trang. */
  readonly hasNoRoster = computed(() => {
    const r = this.roster();
    return !r || (r.enrolled + r.withdrawn) === 0;
  });

  readonly totalSectionRosterCount = computed(() => {
    const r = this.roster();
    return r ? r.enrolled + r.withdrawn : 0;
  });

  readonly visibleEnrollments = computed<IEnrollment[]>(() => this.roster()?.enrollments ?? []);

  readonly lecturerOptions = computed(() => this.lecturers().filter(user => user.status === 'ACTIVE' && user.roles.includes(SystemConstant.ROLE.LECTURER)));

  readonly lecturersText = computed(() => sectionLecturersText(
    this.section(),
    this.currentUserId(),
    this.currentUserName(),
  ));

  readonly needsReason = computed(() => this.section()?.status === 'LOCKED' && this.targetStatus() !== 'LOCKED');

  ngOnInit(): void {
    this.roles.set(this.authSvc.getRoles());
    this.currentUserId.set(this.authSvc.getUserId());
    this.currentUserName.set(this.authSvc.getNameOfLogin?.() ?? '');

    this.rosterSearchSubject$
      .pipe(
        map(q => q.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.rosterPage.set(0);
        this.loadRoster();
      });

    if (this.canManage() && typeof this.sectionSvc.getLecturers === 'function') {
      this.sectionSvc.getLecturers().pipe(catchError(() => of(null))).subscribe(list => {
        this.lecturers.set(list ?? []);
        this.lecturerListAvailable.set(list !== null);
      });
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
        this.loadRoster();
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  private loadRoster(): void {
    this.isLoadingRoster.set(true);
    const filter = this.rosterFilter();
    const status = filter === 'ALL' ? undefined : filter;
    const search = this.rosterSearch().trim() || undefined;
    this.enrollmentSvc.getEnrollments(
      this.sectionId(),
      status,
      search,
      this.rosterPage(),
      this.rosterSize(),
    ).subscribe({
      next: list => {
        this.roster.set(list);
        this.rosterTotalElements.set(list.totalElements ?? list.enrollments.length);
        this.rosterPage.set(list.page ?? this.rosterPage());
        this.rosterSize.set(list.size ?? this.rosterSize());
        this.isLoadingRoster.set(false);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoadingRoster.set(false);
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  onRosterFilterChange(filter: RosterFilter): void {
    this.rosterFilter.set(filter);
    this.rosterPage.set(0);
    this.loadRoster();
  }

  onRosterSearchChange(keyword: string): void {
    this.rosterSearch.set(keyword);
    this.rosterSearchSubject$.next(keyword);
  }

  onRosterPageIndexChange(page1Indexed: number): void {
    this.rosterPage.set(Math.max(0, page1Indexed - 1));
    this.loadRoster();
  }

  onRosterPageSizeChange(newSize: number): void {
    this.rosterSize.set(newSize);
    this.rosterPage.set(0);
    this.loadRoster();
  }

  /** Rút khỏi lớp hoặc ghi danh lại một sinh viên (US-20/AC-4). Số đếm lấy lại từ API, UI không tự cộng trừ. */
  changeEnrollment(enrollment: IEnrollment, status: EnrollmentStatus): void {
    this.busyEnrollmentId.set(enrollment.id);
    this.actionError.set(null);
    this.enrollmentSvc.updateStatus(enrollment.id, status).subscribe({
      next: () => {
        this.busyEnrollmentId.set(null);
        this.alert.success(status === 'WITHDRAWN' ? `Đã rút ${enrollment.studentCode} khỏi lớp` : `Đã ghi danh lại ${enrollment.studentCode}`);
        this.loadRoster();
        this.refreshSection();
      },
      error: err => {
        this.busyEnrollmentId.set(null);
        const message = toUserError(err).message;
        this.actionError.set(message);
        this.alert.error(message);
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
