import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { STUDENT_STATUS_DISPLAY, STUDENT_STATUS_OPTIONS } from '@constants/academic-display.constant';
import { IPagedResults } from '@models/common/response-data.model';
import { IUserError } from '@models/common/user-error.model';
import { StudentResponse, StudentStatus } from '@models/student/student.model';
import { toUserError } from '@services/common/api-error.util';
import { ImportTemplateFormat } from '@services/common/import-file.util';
import { StudentService } from '@services/student/student.service';
import { CsvImportModalComponent } from '@widget/csv-import-modal/csv-import-modal.component';
import { DisplayChipComponent } from '@widget/display-chip/display-chip.component';
import { ErrorStateComponent } from '@widget/error-state/error-state.component';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { Paginate } from '@widget/paginate/paginate.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ToastrService } from 'ngx-toastr';

const MAX_BATCH_STATUS_UPDATE = 500;

/**
 * Trang Quản lý Sinh viên (chỉ ADMIN): tìm kiếm, lọc theo khóa/trạng thái, đổi trạng thái đơn lẻ hoặc hàng loạt,
 * và hai luồng import riêng biệt (tạo mới sinh viên mặc định ACTIVE, và import đổi trạng thái hàng loạt).
 */
@Component({
  selector: 'app-list-students',
  templateUrl: './list-students.component.html',
  styleUrl: './list-students.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzDropdownModule,
    NzInputModule,
    NzMenuModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    CsvImportModalComponent,
    DisplayChipComponent,
    ErrorStateComponent,
    TablePaginateComponent,
  ],
})
export class ListStudentsComponent implements OnInit {
  private readonly studentSvc = inject(StudentService);
  private readonly alert = inject(ToastrService);
  private readonly nzModalSvc = inject(NzModalService);

  protected readonly studentStatusDisplay = STUDENT_STATUS_DISPLAY;
  protected readonly statusOptions = STUDENT_STATUS_OPTIONS;
  protected readonly maxBatchSize = MAX_BATCH_STATUS_UPDATE;

  readonly page = signal(0);
  readonly size = signal(20);
  readonly search = signal('');
  readonly cohort = signal('');
  readonly statusFilter = signal<StudentStatus | null>(null);

  readonly pageResult = signal<IPagedResults<StudentResponse> | null>(null);
  readonly isLoading = signal(false);
  readonly loadError = signal<IUserError | null>(null);

  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly batchTargetStatus = signal<StudentStatus | null>(null);
  readonly isBatchUpdating = signal(false);
  readonly busyStudentId = signal<string | null>(null);

  readonly isCreateImportVisible = signal(false);
  readonly isStatusImportVisible = signal(false);

  readonly downloadCreateTemplateFn = (format: ImportTemplateFormat) => this.studentSvc.downloadImportTemplate(format);
  readonly importStudentsFn = (file: File) => this.studentSvc.importStudents(file);
  readonly downloadStatusTemplateFn = (format: ImportTemplateFormat) => this.studentSvc.downloadStatusImportTemplate(format);
  readonly importStudentStatusesFn = (file: File) => this.studentSvc.importStudentStatuses(file);

  readonly students = computed(() => this.pageResult()?.content ?? []);

  readonly pageConfig = computed<Paginate<StudentResponse>>(() => {
    const res = this.pageResult();
    if (!res) {
      return new Paginate<StudentResponse>(this.page() + 1, 1, 0, this.size(), []);
    }
    return new Paginate<StudentResponse>(
      res.page + 1,
      Math.max(res.totalPages, 1),
      res.totalElements,
      res.size,
      res.content,
    );
  });

  readonly selectedCount = computed(() => this.selectedIds().size);

  readonly allCurrentPageChecked = computed(() => {
    const list = this.students();
    const selected = this.selectedIds();
    return list.length > 0 && list.every(s => selected.has(s.id));
  });

  readonly someCurrentPageChecked = computed(() => {
    const list = this.students();
    const selected = this.selectedIds();
    return !this.allCurrentPageChecked() && list.some(s => selected.has(s.id));
  });

  readonly hasActiveFilters = computed(() => Boolean(
    this.search().trim() || this.cohort().trim() || this.statusFilter(),
  ));

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.studentSvc.getStudents(this.page(), this.size(), {
      search: this.search(),
      cohort: this.cohort(),
      status: this.statusFilter(),
    }).subscribe({
      next: res => {
        this.pageResult.set(res);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(toUserError(err));
      },
    });
  }

  applyFilters(): void {
    this.page.set(0);
    this.clearSelection();
    this.loadStudents();
  }

  resetFilters(): void {
    this.search.set('');
    this.cohort.set('');
    this.statusFilter.set(null);
    this.page.set(0);
    this.clearSelection();
    this.loadStudents();
  }

  onPageChange(event: Paginate<StudentResponse>): void {
    this.page.set(Math.max(event.currentPage - 1, 0));
    this.size.set(event.limit);
    this.clearSelection();
    this.loadStudents();
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleRowSelection(id: string, checked: boolean): void {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  toggleAllCurrentPage(checked: boolean): void {
    const list = this.students();
    this.selectedIds.update(current => {
      const next = new Set(current);
      for (const student of list) {
        if (checked) {
          next.add(student.id);
        } else {
          next.delete(student.id);
        }
      }
      return next;
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  changeSingleStatus(student: StudentResponse, targetStatus: StudentStatus): void {
    if (targetStatus === student.status || this.busyStudentId()) {
      return;
    }
    this.busyStudentId.set(student.id);
    this.studentSvc.updateStatus(student.id, targetStatus).subscribe({
      next: updated => {
        this.busyStudentId.set(null);
        this.pageResult.update(current => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            content: current.content.map(item => (item.id === updated.id ? updated : item)),
          };
        });
        this.alert.success(`Đã đổi trạng thái ${student.studentCode} sang "${this.studentStatusDisplay[targetStatus].label}".`);
      },
      error: err => {
        this.busyStudentId.set(null);
        this.alert.error(toUserError(err).message);
      },
    });
  }

  confirmBatchStatusUpdate(): void {
    const target = this.batchTargetStatus();
    const ids = [...this.selectedIds()];
    if (!target || ids.length === 0 || ids.length > MAX_BATCH_STATUS_UPDATE || this.isBatchUpdating()) {
      return;
    }
    const targetLabel = this.studentStatusDisplay[target].label;
    const warning = target !== 'ACTIVE'
      ? ' Sinh viên không ở trạng thái Đang học sẽ không thể ghi danh mới vào lớp học phần.'
      : '';

    this.nzModalSvc.confirm({
      nzWidth: 460,
      nzTitle: `Cập nhật trạng thái cho ${ids.length} sinh viên?`,
      nzContent: `Chuyển ${ids.length} sinh viên đã chọn sang trạng thái "${targetLabel}".${warning}`,
      nzOkText: 'Xác nhận cập nhật',
      nzCancelText: 'Hủy',
      nzOnOk: () => this.executeBatchStatusUpdate(ids, target),
    });
  }

  onImportSuccess(): void {
    this.clearSelection();
    this.loadStudents();
  }

  private executeBatchStatusUpdate(ids: string[], target: StudentStatus): void {
    this.isBatchUpdating.set(true);
    this.studentSvc.batchUpdateStatus(ids, target).subscribe({
      next: res => {
        this.isBatchUpdating.set(false);
        this.clearSelection();
        this.batchTargetStatus.set(null);
        this.alert.success(`Đã cập nhật trạng thái cho ${res.updatedCount}/${res.requestedCount} sinh viên.`);
        this.loadStudents();
      },
      error: err => {
        this.isBatchUpdating.set(false);
        this.alert.error(toUserError(err).message);
      },
    });
  }
}
