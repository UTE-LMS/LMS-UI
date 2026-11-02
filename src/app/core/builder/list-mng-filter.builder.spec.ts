import { TestBed } from '@angular/core/testing';
import { IPagedResults } from '@models/common/response-data.model';
import { Paginate } from '@widget/paginate/paginate.model';
import { Observable, of, throwError } from 'rxjs';
import { createListManagerFilter } from './list-mng-filter.builder';

interface Row {
  id: string;
}
interface RowFilter {
  keyword: string;
}

/** DỮ LIỆU THỬ NGHIỆM: trang kết quả giả, không phải dữ liệu thật. */
function pagedResult(rows: Row[], pageNumber: number, pageSize: number, totalElements: number): IPagedResults<Row> {
  const totalPages = Math.ceil(totalElements / pageSize);
  // Hợp đồng phân trang zero-indexed (API-CONTRACT.md §5.1.3)
  return {
    content: rows,
    page: pageNumber,
    size: pageSize,
    totalElements,
    totalPages,
    last: pageNumber + 1 >= totalPages,
  };
}

type FetchFn = (
  filter: Partial<RowFilter>, page: number, size: number, sort?: string, column?: string,
) => Observable<IPagedResults<Row>>;

function create(fetchFn: FetchFn) {
  return TestBed.runInInjectionContext(() => createListManagerFilter<Row, RowFilter>(fetchFn));
}

describe('NT-UI/AC-3: createListManagerFilter (danh sách phân trang có bộ lọc)', () => {
  it('tự gọi API trang 1, 10 dòng khi khởi tạo và dựng Paginate từ phản hồi', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([{ id: 'a' }, { id: 'b' }], 0, 10, 25)));
    const manager = create(fetchFn);
    TestBed.tick();

    expect(fetchFn).toHaveBeenCalledWith({}, 1, 10, 'desc', 'trangThai');
    const page = manager.listData();
    expect(page.data).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(page.currentPage).toBe(1);
    expect(page.limit).toBe(10);
    expect(page.totalItem).toBe(25);
    expect(page.totalPage).toBe(3);
  });

  it('API lỗi: danh sách rỗng giữ nguyên trang/kích thước hiện tại, không ném lỗi (ca âm)', () => {
    const manager = create(() => throwError(() => new Error('500')));
    TestBed.tick();

    const page = manager.listData();
    expect(page.data).toEqual([]);
    expect(page.totalItem).toBe(0);
    expect(page.currentPage).toBe(1);
    expect(page.limit).toBe(10);
  });

  it('applySearch gọi lại API với bộ lọc hiện tại và đưa về trang 1', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 0, 10, 0)));
    const manager = create(fetchFn);
    TestBed.tick();

    manager.pageChange(new Paginate<Row>(3, 5, 50, 10));
    TestBed.tick();
    manager.filter.keyword = 'toan';
    manager.applySearch();
    TestBed.tick();

    expect(fetchFn).toHaveBeenLastCalledWith({ keyword: 'toan' }, 1, 10, 'desc', 'trangThai');
  });

  it('applySearch(false) giữ nguyên trang hiện tại (ca biên)', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 0, 10, 0)));
    const manager = create(fetchFn);
    TestBed.tick();

    manager.pageChange(new Paginate<Row>(3, 5, 50, 10));
    TestBed.tick();
    manager.applySearch(false);
    TestBed.tick();

    expect(fetchFn).toHaveBeenLastCalledWith({}, 3, 10, 'desc', 'trangThai');
  });

  it('pageChange đổi trang và kích thước trang', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 1, 20, 0)));
    const manager = create(fetchFn);
    TestBed.tick();

    manager.pageChange(new Paginate<Row>(2, 5, 100, 20));
    TestBed.tick();

    expect(fetchFn).toHaveBeenLastCalledWith({}, 2, 20, 'desc', 'trangThai');
  });

  it('resetFilter xóa mọi khóa lọc rồi tải lại từ trang 1', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 0, 10, 0)));
    const manager = create(fetchFn);
    manager.filter.keyword = 'abc';
    manager.applySearch();
    TestBed.tick();

    manager.resetFilter();
    TestBed.tick();

    expect(manager.filter).toEqual({});
    expect(fetchFn).toHaveBeenLastCalledWith({}, 1, 10, 'desc', 'trangThai');
  });

  it('triggerReload gọi API lại với cùng tham số', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 0, 10, 0)));
    const manager = create(fetchFn);
    TestBed.tick();
    const callsBefore = fetchFn.mock.calls.length;

    manager.triggerReload();
    TestBed.tick();

    expect(fetchFn.mock.calls.length).toBe(callsBefore + 1);
    expect(fetchFn).toHaveBeenLastCalledWith({}, 1, 10, 'desc', 'trangThai');
  });

  it('modalData khởi tạo ở hành vi thêm mới, chưa có dữ liệu', () => {
    const manager = create(() => of(pagedResult([], 0, 10, 0)));
    expect(manager.modalData().action).toBe('ADD');
    expect(manager.modalData().data).toBeNull();
  });
});
