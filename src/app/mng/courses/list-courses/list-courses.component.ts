import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { createListManagerNoFilter } from '@builder/list-mng-no-filter.builder';
import { SystemConstant } from '@constants/system.constant';
import { ICourse } from '@models/course/course.model';
import { ITerm, TermStatus } from '@models/course/term.model';
import { AuthService } from '@services/auth/auth.service';
import { toApiError } from '@services/common/api-error.util';
import { CourseService } from '@services/course/course.service';
import { TermService } from '@services/course/term.service';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, map, Subject } from 'rxjs';
import { CourseImportModalComponent } from '../course-import-modal/course-import-modal.component';
import { CourseModalComponent } from '../course-modal/course-modal.component';
import { TermModalComponent } from '../term-modal/term-modal.component';

@Component({
  selector: 'app-list-courses',
  templateUrl: './list-courses.component.html',
  styleUrl: './list-courses.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    TablePaginateComponent,
    StatusChipComponent,
    CourseModalComponent,
    CourseImportModalComponent,
    TermModalComponent,
  ],
})
export class ListCoursesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly courseSvc = inject(CourseService);
  private readonly termSvc = inject(TermService);
  private readonly authSvc = inject(AuthService);
  private readonly alert = inject(ToastrService);
  private readonly nzModal = inject(NzModalService);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<'COURSES' | 'TERMS'>('COURSES');
  readonly userRoles = signal<string[]>([]);

  /** Quản trị viên cấp trường */
  readonly isAdmin = computed(() => this.userRoles().includes(SystemConstant.ROLE.ADMIN));

  /** Quản lý Chương trình đào tạo (thuộc Khoa phụ trách) */
  readonly isProgramManager = computed(() => this.userRoles().includes(SystemConstant.ROLE.PROGRAM_MANAGER));

  /** ADMIN hoặc PROGRAM_MANAGER được thêm/sửa học phần thuộc phạm vi quản lý */
  readonly canManageCourses = computed(() => this.isAdmin() || this.isProgramManager());

  /** Chỉ ADMIN được quản lý học kỳ */
  readonly canManageTerms = computed(() => this.isAdmin());

  /** Quản lý phân trang danh mục Học phần cấp trường / theo Khoa của PM */
  readonly manager = createListManagerNoFilter<ICourse>(
    (page, size, search) => {
      const roles = this.userRoles().length > 0 ? this.userRoles() : this.authSvc.getRoles();
      const isPmOnly =
        roles.includes(SystemConstant.ROLE.PROGRAM_MANAGER)
        && !roles.includes(SystemConstant.ROLE.ADMIN);
      const facultyId = isPmOnly ? this.authSvc.getFacultyId?.() : undefined;
      return facultyId
        ? this.courseSvc.getCourses(page - 1, size, search, facultyId)
        : this.courseSvc.getCourses(page - 1, size, search);
    },
  );

  /** Trạng thái Modal Học phần */
  readonly isCourseModalVisible = signal(false);
  readonly editingCourse = signal<ICourse | null>(null);
  readonly isImportModalVisible = signal(false);

  /** Danh sách Học kỳ (F05a) */
  readonly terms = signal<ITerm[]>([]);
  readonly termPage = signal(0);
  readonly termSize = signal(20);
  readonly termTotalElements = signal(0);
  readonly termSearch = signal('');
  readonly termStatusFilter = signal<TermStatus | null>(null);
  readonly isTermsLoading = signal(false);
  readonly hasTermsError = signal(false);
  readonly isTermModalVisible = signal(false);
  readonly editingTerm = signal<ITerm | null>(null);
  private readonly termSearchSubject$ = new Subject<string>();

  /** Modal nhập lý do mở lại học kỳ SCORE_LOCKED -> OPEN (US-18/AC-3) */
  readonly isReopenModalVisible = signal(false);
  readonly reopeningTerm = signal<ITerm | null>(null);
  readonly reopenReason = signal('');
  readonly isReopening = signal(false);

  ngOnInit(): void {
    // F05a: màn Lớp học phần liên kết thẳng tới tab Học kỳ bằng ?tab=terms
    if (this.route.snapshot.queryParamMap.get('tab') === 'terms') {
      this.activeTab.set('TERMS');
    }
    this.userRoles.set(this.authSvc.getRoles());

    this.termSearchSubject$
      .pipe(
        map(q => q.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.termPage.set(0);
        this.loadTerms();
      });

    this.loadTerms();
  }

  switchTab(tab: 'COURSES' | 'TERMS'): void {
    this.activeTab.set(tab);
  }

  clearSearch(): void {
    this.manager.searchValue.set('');
    this.manager.applySearch(true);
  }

  // ========== HỌC PHẦN (COURSES) ==========

  openCreateCourseModal(): void {
    this.editingCourse.set(null);
    this.isCourseModalVisible.set(true);
  }

  openImportCourseModal(): void {
    this.isImportModalVisible.set(true);
  }

  onCoursesImported(): void {
    this.manager.triggerReload();
  }

  openEditCourseModal(course: ICourse): void {
    this.editingCourse.set(course);
    this.isCourseModalVisible.set(true);
  }

  onCourseSaved(): void {
    this.manager.triggerReload();
  }

  confirmDeleteCourse(course: ICourse): void {
    this.nzModal.confirm({
      nzTitle: `Xóa học phần ${course.code}?`,
      nzContent: `Bạn có chắc chắn muốn xóa học phần "${course.name}" khỏi kho học phần cấp trường? Học phần đã gán vào CTĐT hoặc đã có đề cương sẽ không thể xóa.`,
      nzOkText: 'Xóa học phần',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.courseSvc.deleteCourse(course.id).subscribe({
          next: () => {
            this.alert.success(`Đã xóa học phần ${course.code}`);
            this.manager.triggerReload();
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể xóa học phần đã có dữ liệu tham chiếu');
          },
        });
      },
    });
  }

  // ========== HỌC KỲ (TERMS - F05a US-18) ==========

  loadTerms(): void {
    this.isTermsLoading.set(true);
    this.hasTermsError.set(false);
    this.termSvc.getTerms(
      this.termSearch().trim() || undefined,
      this.termStatusFilter() ?? undefined,
      this.termPage(),
      this.termSize(),
    ).subscribe({
      next: res => {
        const list = res.content ?? [];
        this.isTermsLoading.set(false);
        this.terms.set(list);
        this.termTotalElements.set(res.totalElements ?? list.length);
        this.termPage.set(res.page ?? this.termPage());
        this.termSize.set(res.size ?? this.termSize());
      },
      error: () => {
        this.isTermsLoading.set(false);
        this.hasTermsError.set(true);
      },
    });
  }

  onTermSearchChange(keyword: string): void {
    this.termSearch.set(keyword);
    this.termSearchSubject$.next(keyword);
  }

  onTermStatusFilterChange(status: TermStatus | null): void {
    this.termStatusFilter.set(status);
    this.termPage.set(0);
    this.loadTerms();
  }

  onTermPageIndexChange(page1Indexed: number): void {
    this.termPage.set(Math.max(0, page1Indexed - 1));
    this.loadTerms();
  }

  onTermPageSizeChange(newSize: number): void {
    this.termSize.set(newSize);
    this.termPage.set(0);
    this.loadTerms();
  }

  openCreateTermModal(): void {
    this.editingTerm.set(null);
    this.isTermModalVisible.set(true);
  }

  openEditTermModal(term: ITerm): void {
    this.editingTerm.set(term);
    this.isTermModalVisible.set(true);
  }

  changeTermStatus(term: ITerm, nextStatus: TermStatus): void {
    if (term.status === 'SCORE_LOCKED' && nextStatus === 'OPEN') {
      this.reopeningTerm.set(term);
      this.reopenReason.set('');
      this.isReopenModalVisible.set(true);
      return;
    }

    this.termSvc.updateTermStatus(term.id, { status: nextStatus }).subscribe({
      next: () => {
        this.alert.success(`Đã cập nhật trạng thái học kỳ ${term.code}`);
        this.loadTerms();
      },
      error: err => {
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể đổi trạng thái học kỳ');
      },
    });
  }

  submitReopenTerm(): void {
    const term = this.reopeningTerm();
    const reason = this.reopenReason().trim();
    if (!term) {
      return;
    }
    if (!reason) {
      this.alert.error('Vui lòng nhập lý do giải trình khi mở lại sổ điểm học kỳ');
      return;
    }

    this.isReopening.set(true);
    this.termSvc.updateTermStatus(term.id, { status: 'OPEN', reason }).subscribe({
      next: () => {
        this.isReopening.set(false);
        this.isReopenModalVisible.set(false);
        this.alert.success(`Đã mở lại học kỳ ${term.code}`);
        this.loadTerms();
      },
      error: err => {
        this.isReopening.set(false);
        const apiErr = toApiError(err);
        this.alert.error(apiErr?.message ?? 'Không thể mở lại học kỳ');
      },
    });
  }

  confirmDeleteTerm(term: ITerm): void {
    this.nzModal.confirm({
      nzTitle: `Xóa học kỳ ${term.code}?`,
      nzContent: `Bạn có chắc chắn muốn xóa học kỳ "${term.code}"? Học kỳ đã được gắn làm mốc hiệu lực đề cương sẽ không thể xóa.`,
      nzOkText: 'Xóa học kỳ',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.termSvc.deleteTerm(term.id).subscribe({
          next: () => {
            this.alert.success(`Đã xóa học kỳ ${term.code}`);
            this.loadTerms();
          },
          error: err => {
            const apiErr = toApiError(err);
            this.alert.error(apiErr?.message ?? 'Không thể xóa học kỳ');
          },
        });
      },
    });
  }
}
