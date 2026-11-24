import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { createListManagerFilter } from '@builder/list-mng-filter.builder';
import { AUDIT_ACTION_LABEL, AUDIT_ENTITY_LABEL } from '@constants/analytics-display.constant';
import { toOptions } from '@constants/assessment-display.constant';
import { AuditAction, IAuditLog, IAuditLogFilter } from '@models/common/audit-log.model';
import { IUser } from '@models/user/user.model';
import { AuditLogService } from '@services/user/audit-log.service';
import { UserService } from '@services/user/user.service';
import { TablePaginateComponent } from '@widget/paginate/paginate.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { catchError, map, of } from 'rxjs';

/** Một dòng so sánh trước/sau của khung chi tiết. */
export interface IAuditDiffRow {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

/**
 * F01 - Nhật ký thao tác (chỉ ADMIN). Chỉ đọc: backend không có API sửa/xóa nhật ký.
 * Lọc theo hành động, thực thể, người thực hiện và khoảng thời gian (AND).
 */
/** Ghép khóa của hai ảnh chụp trước/sau để so sánh. Chỉ phục vụ hiển thị. */
export function buildDiff(log: IAuditLog | null): IAuditDiffRow[] {
  if (!log) {
    return [];
  }
  const before = log.before ?? {};
  const after = log.after ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.map(key => ({
    key,
    before: before[key],
    after: after[key],
    changed: JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  }));
}

@Component({
  selector: 'app-list-audit-logs',
  imports: [
    FormsModule, DatePipe, JsonPipe, NzButtonModule, NzDatePickerModule, NzInputModule, NzSelectModule,
    NzTableModule, TablePaginateComponent,
  ],
  templateUrl: './list-audit-logs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListAuditLogsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auditLogSvc = inject(AuditLogService);
  private readonly userSvc = inject(UserService);

  protected readonly actionLabel = AUDIT_ACTION_LABEL;
  protected readonly actionOptions = toOptions(AUDIT_ACTION_LABEL);
  protected readonly entityLabel = AUDIT_ENTITY_LABEL;
  protected readonly entityOptions = Object.entries(AUDIT_ENTITY_LABEL).map(([value, label]) => ({ value, label }));

  readonly users = signal<IUser[]>([]);
  readonly usernameById = computed(() => new Map(this.users().map(u => [u.id, u.username])));

  /** Khoảng thời gian giữ dạng Date cho date-picker; chỉ đổi sang ISO khi áp dụng bộ lọc. */
  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);
  readonly rangeError = signal('');

  readonly selected = signal<IAuditLog | null>(null);

  readonly manager = createListManagerFilter<IAuditLog, IAuditLogFilter>(
    (filter, page, size) => this.auditLogSvc.filter(filter, page - 1, size),
  );

  readonly diffRows = computed<IAuditDiffRow[]>(() => buildDiff(this.selected()));

  ngOnInit(): void {
    // Chỉ để hiện tên đăng nhập thay cho ObjectId; lỗi thì vẫn hiện ID.
    this.userSvc.filter(0, 100).pipe(map(page => page.content), catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe(list => this.users.set(list));
  }

  setAction(action: AuditAction | null): void {
    this.manager.filter.action = action ?? undefined;
  }

  search(): void {
    const from = this.fromDate();
    const to = this.toDate();
    if (from && to && from.getTime() > to.getTime()) {
      this.rangeError.set('Thời điểm bắt đầu không được sau thời điểm kết thúc.');
      return;
    }
    this.rangeError.set('');
    this.manager.filter.from = from ? from.toISOString() : undefined;
    this.manager.filter.to = to ? to.toISOString() : undefined;
    this.selected.set(null);
    this.manager.applySearch(true);
  }

  reset(): void {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.rangeError.set('');
    this.selected.set(null);
    this.manager.resetFilter();
  }

  userLabel(userId: string | null): string {
    if (!userId) {
      return '—';
    }
    return this.usernameById().get(userId) ?? userId;
  }

  toggleDetail(log: IAuditLog): void {
    this.selected.update(current => (current?.id === log.id ? null : log));
  }
}
