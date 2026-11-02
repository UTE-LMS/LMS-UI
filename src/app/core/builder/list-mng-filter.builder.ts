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
    manager = createListManagerFilter<IAcademicRanks, IAcademicRanksFilter>(
      (filterObj, page, size) => {
        return this.academicRanksSvc.filterPaging(filterObj, page - 1, size);
      }
    );

    // On HTML template, just call: manager.searchValue(), manager.applySearch(), manager.listData(),...
  }

*/
export function createListManagerFilter<T, FilterType>(
  fetchDataFn: (
    filter: Partial<FilterType>,
    page: number,
    size: number,
    sort?: string,
    column?: string,
  ) => Observable<IPagedResults<T>>,
) {
  const filter: Partial<FilterType> = {};
  const appliedQuery = signal({
    page: 1,
    size: 10,
    sort: 'desc',
    column: 'trangThai',
    filter: {} as Partial<FilterType>,
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
        return fetchDataFn(query.filter, query.page, query.size, query.sort, query.column).pipe(
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
      filter: { ...filter },
    }));
  };

  const resetFilter = () => {
    for (const key in filter) {
      delete filter[key];
    }
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
    filter,
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
