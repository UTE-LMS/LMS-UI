import { computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ModalData } from '@models/common/modal-data.model';
import { IPagedResults } from '@models/common/response-data.model';
import { Paginate } from '@widget/paginate/paginate.model';
import { catchError, Observable, of, switchMap, tap } from 'rxjs';

/*
  Usage:

  export class ListAcademicRanksComponent {
    private academicRanksSvc = inject(AcademicRanksService);

    // Khởi tạo manager và truyền hàm gọi API tương ứng của màn hình này
    manager = createListManagerNoFilter<IAcademicRanks>(
      (page, size, search) => {
        return this.academicRanksSvc.getAllPaging(page - 1, size, search);
      }
    );

    // On HTML template, just call: manager.searchValue(), manager.applySearch(), manager.listData(),...
  }

*/
export function createListManagerNoFilter<T>(
  fetchDataFn: (
    page: number,
    size: number,
    search?: string,
    sort?: string,
    column?: string,
  ) => Observable<IPagedResults<T>>,
) {
  const searchValue = signal('');

  const appliedQuery = signal({
    page: 1,
    size: 10,
    sort: 'desc',
    column: 'trangThai',
  });

  const modalData = signal(new ModalData<T>());
  // Trạng thái tải/lỗi để màn hình phân biệt "đang tải", "lỗi" và "danh sách rỗng" (rule 02)
  const isLoading = signal(true);
  const hasError = signal(false);

  // Auto call API
  const listResponse = toSignal(
    toObservable(appliedQuery).pipe(
      switchMap(query => {
        isLoading.set(true);
        hasError.set(false);
        return fetchDataFn(query.page, query.size, searchValue(), query.sort, query.column).pipe(
          tap(() => isLoading.set(false)),
          catchError(() => {
            isLoading.set(false);
            hasError.set(true);
            return of(null);
          }),
        );
      }),
    ),
    { initialValue: null },
  );

  const listData = computed(() => {
    const res = listResponse();
    const page = new Paginate<T>();
    if (res) {
      page.currentPage = res.page + 1;
      page.limit = res.size;
      page.totalPage = res.totalPages;
      page.totalItem = res.totalElements;
      page.data = res.content;
    } else {
      page.currentPage = appliedQuery().page;
      page.limit = appliedQuery().size;
    }
    return page;
  });

  const applySearch = (isResetPage = true) => {
    appliedQuery.update(q => ({
      ...q,
      page: isResetPage ? 1 : q.page,
      search: searchValue(),
    }));
  };

  const resetFilter = () => {
    searchValue.set('');
    applySearch(true);
  };

  const pageChange = (page: Paginate<T>) => {
    appliedQuery.update(q => ({
      ...q,
      page: page.currentPage,
      size: page.limit,
    }));
  };

  const triggerReload = () => {
    appliedQuery.update(q => ({ ...q }));
  };

  return {
    searchValue,
    modalData,
    listData,
    isLoading,
    hasError,
    applySearch,
    resetFilter,
    pageChange,
    triggerReload,
  };
}
