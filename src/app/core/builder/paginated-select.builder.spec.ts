import { TestBed } from '@angular/core/testing';
import { IPagedResults } from '@models/common/response-data.model';
import { Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPaginatedSelect, PaginatedSelectQuery } from './paginated-select.builder';

interface OptionItem {
  id: string;
  label: string;
}

/** DỮ LIỆU THỬ NGHIỆM: danh sách option phân trang giả phục vụ unit test. */
function pagedOptions(
  content: OptionItem[],
  page: number,
  size: number,
  totalElements: number,
): IPagedResults<OptionItem> {
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    last: page + 1 >= totalPages,
  };
}

describe('createPaginatedSelect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tải trang 0 với size mặc định 20 khi gọi loadInitial hoặc mở dropdown lần đầu', () => {
    const fetchPage = vi.fn((q: PaginatedSelectQuery) => of(pagedOptions([{ id: '1', label: 'Lớp 1' }], q.page, q.size, 1)));
    const select = TestBed.runInInjectionContext(() => createPaginatedSelect<OptionItem>({
      fetchPage,
      getId: x => x.id,
    }));

    select.onOpenChange(true);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith({ page: 0, size: 20, search: undefined });
    expect(select.options()).toEqual([{ id: '1', label: 'Lớp 1' }]);
    expect(select.last()).toBe(true);

    select.onOpenChange(true);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('cuộn đáy gọi page + 1, nối khử trùng theo id và dừng khi last = true hoặc đang tải', () => {
    const page1Subject = new Subject<IPagedResults<OptionItem>>();
    const fetchPage = vi.fn((q: PaginatedSelectQuery): Observable<IPagedResults<OptionItem>> => {
      if (q.page === 0) {
        return of(
          pagedOptions(
            [
              { id: '1', label: 'Item 1' },
              { id: '2', label: 'Item 2' },
            ],
            0,
            2,
            3,
          ),
        );
      }
      return page1Subject.asObservable();
    });

    const select = TestBed.runInInjectionContext(() => createPaginatedSelect<OptionItem>({
      fetchPage,
      getId: x => x.id,
      pageSize: 2,
    }));

    select.loadInitial();
    expect(select.last()).toBe(false);

    select.loadMore();
    expect(select.loadingMore()).toBe(true);
    // Không gọi trùng trong lúc đang tải thêm
    select.loadMore();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, size: 2, search: undefined });

    page1Subject.next(
      pagedOptions(
        [
          { id: '2', label: 'Item 2 (trùng)' },
          { id: '3', label: 'Item 3' },
        ],
        1,
        2,
        3,
      ),
    );
    page1Subject.complete();

    expect(select.loadingMore()).toBe(false);
    expect(select.last()).toBe(true);
    expect(select.options()).toEqual([
      { id: '1', label: 'Item 1' },
      { id: '2', label: 'Item 2' },
      { id: '3', label: 'Item 3' },
    ]);

    // Đã ở trang cuối -> không gọi thêm
    select.loadMore();
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('tìm kiếm server-side debounce 300ms, switchMap hủy request cũ và reset về page = 0', () => {
    const req1 = new Subject<IPagedResults<OptionItem>>();
    const fetchPage = vi.fn((q: PaginatedSelectQuery): Observable<IPagedResults<OptionItem>> => {
      if (q.search === 'sec-a') {
        return req1.asObservable();
      }
      if (q.search === 'sec-b') {
        return of(pagedOptions([{ id: 'b', label: 'Section B' }], 0, 20, 1));
      }
      return of(pagedOptions([{ id: '0', label: 'Mặc định' }], q.page, q.size, 40));
    });

    const select = TestBed.runInInjectionContext(() => createPaginatedSelect<OptionItem>({
      fetchPage,
      getId: x => x.id,
    }));

    select.loadInitial();
    select.loadMore();
    expect(select.page()).toBe(1);

    // Phát '' khi chưa từng search khác '' -> không gọi thừa
    select.onSearch('');
    vi.advanceTimersByTime(300);
    expect(fetchPage).toHaveBeenCalledTimes(2);

    // Gõ 'sec-a', chưa hoàn tất request thì đổi sang 'sec-b'
    select.onSearch('sec-a');
    vi.advanceTimersByTime(300);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, size: 20, search: 'sec-a' });

    select.onSearch('sec-b');
    vi.advanceTimersByTime(300);
    expect(fetchPage).toHaveBeenCalledTimes(4);
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, size: 20, search: 'sec-b' });

    // Kết quả muộn của req1 không được ghi đè sec-b vì đã switchMap
    req1.next(pagedOptions([{ id: 'a', label: 'Section A trễ' }], 0, 20, 1));
    expect(select.options()).toEqual([{ id: 'b', label: 'Section B' }]);
    expect(select.page()).toBe(0);
  });

  it('reload(true) khi đổi bộ lọc cha xóa search, reset page = 0 và last = false', () => {
    const fetchPage = vi.fn((q: PaginatedSelectQuery) => of(pagedOptions([{ id: 'x', label: `Search=${q.search ?? ''}` }], q.page, q.size, 1)));
    const select = TestBed.runInInjectionContext(() => createPaginatedSelect<OptionItem>({
      fetchPage,
      getId: x => x.id,
    }));

    select.loadInitial();
    select.onSearch('2026');
    vi.advanceTimersByTime(300);
    expect(select.search()).toBe('2026');

    select.reload(true);
    expect(select.search()).toBe('');
    expect(select.page()).toBe(0);
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, size: 20, search: undefined });
  });

  it('syncSelected giữ option đang chọn khi search đổi và gọi fetchById nếu chưa có trong trang 0', () => {
    const fetchPage = vi.fn((q: PaginatedSelectQuery) => {
      if (q.search === 'khac') {
        return of(pagedOptions([{ id: '9', label: 'Khác' }], 0, 20, 1));
      }
      return of(pagedOptions([{ id: '1', label: 'Mục 1' }], 0, 20, 1));
    });
    const fetchById = vi.fn((id: string) => of({ id, label: `Đã tải ${id}` }));

    const select = TestBed.runInInjectionContext(() => createPaginatedSelect<OptionItem>({
      fetchPage,
      getId: x => x.id,
      fetchById,
    }));

    // Mục '99' chưa có ở trang 0 -> tự gọi fetchById
    select.syncSelected('99');
    expect(fetchById).toHaveBeenCalledWith('99');
    expect(select.options().map(o => o.id)).toContain('99');

    // Khi tìm kiếm trả về tập khác, '99' vẫn được ghim trong options
    select.loadInitial();
    select.onSearch('khac');
    vi.advanceTimersByTime(300);
    expect(select.options().map(o => o.id)).toEqual(['9', '99']);
  });

  it('xử lý lỗi khi tải trang đầu mà không treo trạng thái loading', () => {
    const select = TestBed.runInInjectionContext(() => createPaginatedSelect<OptionItem>({
      fetchPage: () => throwError(() => new Error('500')),
      getId: x => x.id,
    }));

    select.loadInitial();
    expect(select.loading()).toBe(false);
    expect(select.error()).toBe(true);
  });
});
