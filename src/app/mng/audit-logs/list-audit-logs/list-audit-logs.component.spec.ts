import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IAuditLog } from '@models/common/audit-log.model';
import { AuditLogService } from '@services/user/audit-log.service';
import { UserService } from '@services/user/user.service';
import { vi as viDate } from 'date-fns/locale';
import { NZ_DATE_LOCALE, NZ_I18N, vi_VN } from 'ng-zorro-antd/i18n';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDiff, ListAuditLogsComponent } from './list-audit-logs.component';

// DỮ LIỆU THỬ NGHIỆM
const log: IAuditLog = {
  id: 'a1', at: '2026-10-27T09:12:00Z', userId: 'u1', username: 'gv.test', actorFullName: 'Giảng viên Thử', action: 'SCORE_UPDATE',
  entity: { collection: 'scores', id: 's1' }, before: { value: 1.5, note: 'x' }, after: { value: 2.5, note: 'x' },
  reason: 'Phúc khảo', ip: '10.0.0.1',
};
const page = (content: IAuditLog[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1, last: true });

registerLocaleData(localeVi);

describe('ListAuditLogsComponent (F01 nhật ký thao tác)', () => {
  let fixture: ComponentFixture<ListAuditLogsComponent>;
  let component: ListAuditLogsComponent;
  let auditSvc: { filter: ReturnType<typeof vi.fn>; };
  let userSvc: { filter: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; };

  beforeEach(async () => {
    auditSvc = { filter: vi.fn(() => of(page([log]))) };
    userSvc = {
      filter: vi.fn(() => of({ ...page([]), content: [{ id: 'u1', username: 'gv.test', fullName: 'Giảng viên Thử' }] })),
      getById: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [ListAuditLogsComponent],
      providers: [
        // nz-date-picker cần locale như core.providers.ts của ứng dụng
        { provide: NZ_I18N, useValue: vi_VN },
        { provide: NZ_DATE_LOCALE, useValue: viDate },
        { provide: AuditLogService, useValue: auditSvc },
        { provide: UserService, useValue: userSvc },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ListAuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('tải trang đầu (page 0), đọc username trực tiếp từ DTO và không gọi UserService lúc khởi tạo', () => {
    expect(auditSvc.filter).toHaveBeenCalledWith({}, 0, 10);
    expect(userSvc.filter).not.toHaveBeenCalled();
    expect(component.actorLabel(log)).toBe('gv.test');
    expect(component.actorLabel({ userId: null, username: null, actorFullName: null })).toBe('Hệ thống');
    expect(component.actorLabel({ userId: 'khong-co', username: null, actorFullName: null })).toBe('khong-co');

    component.userSelect.onOpenChange(true);
    expect(userSvc.filter).toHaveBeenCalledWith(0, 20);
  });

  it('chặn khoảng thời gian ngược và không gọi API', () => {
    auditSvc.filter.mockClear();
    component.fromDate.set(new Date('2026-11-02T00:00:00Z'));
    component.toDate.set(new Date('2026-11-01T00:00:00Z'));
    component.search();
    expect(component.rangeError()).not.toBe('');
    expect(auditSvc.filter).not.toHaveBeenCalled();
  });

  it('áp dụng bộ lọc với thời điểm dạng ISO', () => {
    component.fromDate.set(new Date('2026-11-01T00:00:00Z'));
    component.search();
    fixture.detectChanges();
    expect(auditSvc.filter).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-11-01T00:00:00.000Z' }), 0, 10);
  });

  it('so sánh trước/sau đánh dấu đúng trường thay đổi', () => {
    const rows = buildDiff(log);
    expect(rows.find(r => r.key === 'value')?.changed).toBe(true);
    expect(rows.find(r => r.key === 'note')?.changed).toBe(false);
    expect(buildDiff({ ...log, before: null, after: null })).toEqual([]);
  });

  it('lỗi tải hiển thị nút thử lại', () => {
    auditSvc.filter.mockReturnValue(throwError(() => new Error('mất mạng')));
    component.manager.triggerReload();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Thử lại');
  });
});
