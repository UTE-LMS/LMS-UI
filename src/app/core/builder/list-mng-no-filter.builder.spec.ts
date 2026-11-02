import { TestBed } from '@angular/core/testing';
import { IPagedResults } from '@models/common/response-data.model';
import { Paginate } from '@widget/paginate/paginate.model';
import { Observable, of, throwError } from 'rxjs';
import { createListManagerNoFilter } from './list-mng-no-filter.builder';

interface Row {
  id: string;
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
  page: number, size: number, search?: string, sort?: string, column?: string,
) => Observable<IPagedResults<Row>>;

function create(fetchFn: FetchFn) {
  return TestBed.runInInjectionContext(() => createListManagerNoFilter<Row>(fetchFn));
}

describe('NT-UI/AC-3: createListManagerNoFilter (danh sách phân trang có ô tìm kiếm)', () => {
  it('tự gọi API trang 1, 10 dòng, từ khóa rỗng khi khởi tạo', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([{ id: 'a' }], 0, 10, 1)));
    const manager = create(fetchFn);
    TestBed.tick();

    expect(fetchFn).toHaveBeenCalledWith(1, 10, '', 'desc', 'trangThai');
    expect(manager.listData().data).toEqual([{ id: 'a' }]);
    expect(manager.listData().totalItem).toBe(1);
  });

  it('API lỗi: trả danh sách rỗng với trang hiện tại (ca âm)', () => {
    const manager = create(() => throwError(() => new Error('500')));
    TestBed.tick();

    expect(manager.listData().data).toEqual([]);
    expect(manager.listData().currentPage).toBe(1);
    expect(manager.listData().limit).toBe(10);
  });

  it('applySearch tìm theo từ khóa hiện tại và đưa về trang 1', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 0, 10, 0)));
    const manager = create(fetchFn);
    TestBed.tick();
    manager.pageChange(new Paginate<Row>(4, 9, 90, 10));
    TestBed.tick();

    manager.searchValue.set('clo');
    manager.applySearch();
    TestBed.tick();

    expect(fetchFn).toHaveBeenLastCalledWith(1, 10, 'clo', 'desc', 'trangThai');
  });

  it('applySearch(false) giữ trang hiện tại (ca biên)', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 0, 10, 0)));
    const manager = create(fetchFn);
    TestBed.tick();
    manager.pageChange(new Paginate<Row>(4, 9, 90, 10));
    TestBed.tick();

    manager.applySearch(false);
    TestBed.tick();

    expect(fetchFn).toHaveBeenLastCalledWith(4, 10, '', 'desc', 'trangThai');
  });

  it('resetFilter xóa từ khóa và tải lại từ trang 1', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 0, 10, 0)));
    const manager = create(fetchFn);
    manager.searchValue.set('abc');
    manager.applySearch();
    TestBed.tick();

    manager.resetFilter();
    TestBed.tick();

    expect(manager.searchValue()).toBe('');
    expect(fetchFn).toHaveBeenLastCalledWith(1, 10, '', 'desc', 'trangThai');
  });

  it('pageChange đổi trang và kích thước; triggerReload gọi lại với cùng tham số', () => {
    const fetchFn = vi.fn<FetchFn>(() => of(pagedResult([], 1, 25, 0)));
    const manager = create(fetchFn);
    TestBed.tick();

    manager.pageChange(new Paginate<Row>(2, 4, 100, 25));
    TestBed.tick();
    expect(fetchFn).toHaveBeenLastCalledWith(2, 25, '', 'desc', 'trangThai');

    const callsBefore = fetchFn.mock.calls.length;
    manager.triggerReload();
    TestBed.tick();
    expect(fetchFn.mock.calls.length).toBe(callsBefore + 1);
  });

  it('modalData khởi tạo ở hành vi thêm mới', () => {
    const manager = create(() => of(pagedResult([], 0, 10, 0)));
    expect(manager.modalData().action).toBe('ADD');
  });
});
