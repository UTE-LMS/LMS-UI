import { computed, DestroyRef, inject, Signal, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IPagedResults } from '@models/common/response-data.model';
import {
  catchError,
  debounceTime,
  EMPTY,
  filter,
  finalize,
  map,
  Observable,
  of,
  Subject,
  Subscription,
  switchMap,
} from 'rxjs';

export interface PaginatedSelectQuery {
  page: number;
  size: number;
  search?: string;
}

export interface PaginatedSelectConfig<T> {
  fetchPage: (query: PaginatedSelectQuery) => Observable<IPagedResults<T>>;
  getId: (item: T) => string;
  fetchById?: (id: string) => Observable<T>;
  pageSize?: number;
  debounceMs?: number;
}

export interface PaginatedSelect<T> {
  readonly items: Signal<T[]>;
  readonly options: Signal<T[]>;
  readonly loading: Signal<boolean>;
  readonly loadingMore: Signal<boolean>;
  readonly last: Signal<boolean>;
  readonly totalElements: Signal<number>;
  readonly page: Signal<number>;
  readonly search: Signal<string>;
  readonly error: Signal<boolean>;
  readonly initialized: Signal<boolean>;
  loadInitial: () => void;
  onOpenChange: (open: boolean) => void;
  onSearch: (keyword: string) => void;
  loadMore: () => void;
  reload: (clearSearch?: boolean) => void;
  syncSelected: (selectedIds: string | readonly string[] | null | undefined) => void;
  pinItems: (items: readonly T[]) => void;
  reset: () => void;
}

function dedupeById<T>(list: readonly T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of list) {
    const id = getId(item);
    if (!seen.has(id)) {
      seen.add(id);
      result.push(item);
    }
  }
  return result;
}

/**
 * Helper tái sử dụng cho `nz-select` dùng API phân trang (`page >= 0`, `size <= 100`):
 * - Tải trang nhỏ ban đầu (`size = 20` mặc định).
 * - Cuộn đáy `(nzScrollToBottom)` tự tải `page + 1` và nối khử trùng theo `id`.
 * - Tìm kiếm server-side `[nzServerSearch]="true"` qua `(nzOnSearch)` với debounce 300ms + `switchMap`.
 * - Ghim option đang chọn (`syncSelected` / `pinItems`) để không mất nhãn hiển thị khi đổi search.
 */
export function createPaginatedSelect<T>(config: PaginatedSelectConfig<T>): PaginatedSelect<T> {
  const destroyRef = inject(DestroyRef);
  const pageSize = Math.min(100, Math.max(1, config.pageSize ?? 20));
  const debounceMs = config.debounceMs ?? 300;

  const items = signal<T[]>([]);
  const pinned = signal<T[]>([]);
  const loading = signal(false);
  const loadingMore = signal(false);
  const last = signal(false);
  const totalElements = signal(0);
  const page = signal(0);
  const search = signal('');
  const error = signal(false);
  const initialized = signal(false);

  const options = computed(() => dedupeById([...items(), ...pinned()], config.getId));

  const page0Trigger$ = new Subject<{ search: string; }>();
  const searchInput$ = new Subject<{ term: string; ver: number; }>();

  let lastQueriedSearch = '';
  let searchVersion = 0;
  let loadMoreSub: Subscription | null = null;
  let selectedIdSet = new Set<string>();
  const fetchingIds = new Set<string>();

  const cancelLoadMore = () => {
    if (loadMoreSub) {
      loadMoreSub.unsubscribe();
      loadMoreSub = null;
    }
    loadingMore.set(false);
  };

  const refreshPinnedFromItems = (loaded: readonly T[]) => {
    if (selectedIdSet.size === 0) {
      return;
    }
    const loadedMap = new Map(loaded.map(item => [config.getId(item), item]));
    pinned.update(curr => {
      const nextMap = new Map<string, T>();
      for (const item of curr) {
        const id = config.getId(item);
        if (selectedIdSet.has(id)) {
          nextMap.set(id, loadedMap.get(id) ?? item);
        }
      }
      for (const id of selectedIdSet) {
        const found = loadedMap.get(id);
        if (found) {
          nextMap.set(id, found);
        }
      }
      return Array.from(nextMap.values());
    });
  };

  page0Trigger$
    .pipe(
      switchMap(query => {
        cancelLoadMore();
        lastQueriedSearch = query.search;
        search.set(query.search);
        page.set(0);
        last.set(false);
        error.set(false);
        loading.set(true);
        initialized.set(true);

        return config
          .fetchPage({
            page: 0,
            size: pageSize,
            search: query.search || undefined,
          })
          .pipe(
            catchError(() => {
              error.set(true);
              return of(null);
            }),
          );
      }),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(res => {
      loading.set(false);
      if (!res) {
        return;
      }
      const nextItems = dedupeById(res.content ?? [], config.getId);
      items.set(nextItems);
      page.set(res.page ?? 0);
      totalElements.set(res.totalElements ?? nextItems.length);
      last.set(res.last ?? true);
      refreshPinnedFromItems(nextItems);
    });

  searchInput$
    .pipe(
      map(entry => ({ term: entry.term.trim(), ver: entry.ver })),
      debounceTime(debounceMs),
      filter(entry => entry.ver === searchVersion && entry.term !== lastQueriedSearch),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(entry => {
      page0Trigger$.next({ search: entry.term });
    });

  destroyRef.onDestroy(() => cancelLoadMore());

  const loadInitial = () => {
    if (initialized() || loading()) {
      return;
    }
    page0Trigger$.next({ search: lastQueriedSearch });
  };

  const onOpenChange = (open: boolean) => {
    if (open && !initialized()) {
      loadInitial();
    }
  };

  const onSearch = (keyword: string) => {
    searchVersion += 1;
    searchInput$.next({ term: keyword ?? '', ver: searchVersion });
  };

  const loadMore = () => {
    if (!initialized() || loading() || loadingMore() || last()) {
      return;
    }
    const nextPage = page() + 1;
    loadingMore.set(true);
    error.set(false);

    loadMoreSub = config
      .fetchPage({
        page: nextPage,
        size: pageSize,
        search: lastQueriedSearch || undefined,
      })
      .pipe(
        finalize(() => {
          loadingMore.set(false);
          loadMoreSub = null;
        }),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe({
        next: res => {
          const added = res.content ?? [];
          items.update(curr => dedupeById([...curr, ...added], config.getId));
          page.set(res.page ?? nextPage);
          totalElements.set(res.totalElements ?? items().length);
          last.set(res.last ?? true);
          refreshPinnedFromItems(added);
        },
        error: () => {
          error.set(true);
        },
      });
  };

  const reload = (clearSearch = false) => {
    searchVersion += 1;
    if (clearSearch) {
      lastQueriedSearch = '';
      search.set('');
    }
    items.set([]);
    page0Trigger$.next({ search: lastQueriedSearch });
  };

  const pinItems = (extra: readonly T[]) => {
    if (!extra.length) {
      return;
    }
    pinned.update(curr => dedupeById([...curr, ...extra], config.getId));
  };

  const syncSelected = (selectedIds: string | readonly string[] | null | undefined) => {
    untracked(() => {
      const rawList = Array.isArray(selectedIds)
        ? selectedIds
        : selectedIds
          ? [selectedIds]
          : [];
      const ids = rawList.filter((id): id is string => typeof id === 'string' && id.length > 0);
      selectedIdSet = new Set(ids);

      if (ids.length === 0) {
        pinned.set([]);
        return;
      }

      const known = new Map<string, T>();
      for (const item of pinned()) {
        const id = config.getId(item);
        if (selectedIdSet.has(id)) {
          known.set(id, item);
        }
      }
      for (const item of items()) {
        const id = config.getId(item);
        if (selectedIdSet.has(id)) {
          known.set(id, item);
        }
      }
      pinned.set(Array.from(known.values()));

      if (!config.fetchById) {
        return;
      }
      for (const id of ids) {
        if (known.has(id) || fetchingIds.has(id)) {
          continue;
        }
        fetchingIds.add(id);
        config
          .fetchById(id)
          .pipe(
            catchError(() => EMPTY),
            finalize(() => fetchingIds.delete(id)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe(fetched => {
            const fetchedId = config.getId(fetched);
            if (!selectedIdSet.has(fetchedId)) {
              return;
            }
            pinned.update(curr => dedupeById([...curr, fetched], config.getId));
          });
      }
    });
  };

  const reset = () => {
    searchVersion += 1;
    cancelLoadMore();
    lastQueriedSearch = '';
    search.set('');
    items.set([]);
    pinned.set([]);
    selectedIdSet = new Set<string>();
    page.set(0);
    totalElements.set(0);
    last.set(false);
    loading.set(false);
    error.set(false);
    initialized.set(false);
  };

  return {
    items: items.asReadonly(),
    options,
    loading: loading.asReadonly(),
    loadingMore: loadingMore.asReadonly(),
    last: last.asReadonly(),
    totalElements: totalElements.asReadonly(),
    page: page.asReadonly(),
    search: search.asReadonly(),
    error: error.asReadonly(),
    initialized: initialized.asReadonly(),
    loadInitial,
    onOpenChange,
    onSearch,
    loadMore,
    reload,
    syncSelected,
    pinItems,
    reset,
  };
}
