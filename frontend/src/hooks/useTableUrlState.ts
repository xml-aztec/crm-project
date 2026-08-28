import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { CatalogSortOrder } from '../types/catalog';

interface UseTableUrlStateOptions<F extends Record<string, string>> {
  /** Namespaces the query params (e.g. "cat", "sub", "brand") so multiple tables can share one URL. */
  prefix: string;
  defaultSortBy: string;
  defaultSortOrder?: CatalogSortOrder;
  /** Keys + default ("" = no filter) for any extra filters beyond search/sort/page. */
  defaultFilters?: F;
}

export interface UseTableUrlStateResult<F extends Record<string, string>> {
  page: number;
  search: string;
  sortBy: string;
  sortOrder: CatalogSortOrder;
  filters: F;
  setPage: (page: number) => void;
  setSearch: (value: string) => void;
  setSort: (sortBy: string, sortOrder?: CatalogSortOrder) => void;
  setFilter: (key: keyof F & string, value: string) => void;
  reset: () => void;
}

/**
 * Keeps a table's page/search/sort/filters state in the URL query string
 * (so the view survives a refresh and can be shared as a link), namespaced
 * by `prefix` so several tables (tabs) can coexist in one URL.
 */
export function useTableUrlState<F extends Record<string, string> = Record<string, never>>({
  prefix,
  defaultSortBy,
  defaultSortOrder = 'asc',
  defaultFilters = {} as F,
}: UseTableUrlStateOptions<F>): UseTableUrlStateResult<F> {
  const [searchParams, setSearchParams] = useSearchParams();

  const k = useCallback((name: string) => `${prefix}_${name}`, [prefix]);

  const page = Math.max(1, Number(searchParams.get(k('page'))) || 1);
  const search = searchParams.get(k('search')) || '';
  const sortBy = searchParams.get(k('sort_by')) || defaultSortBy;
  const sortOrder = (searchParams.get(k('sort_order')) as CatalogSortOrder | null) || defaultSortOrder;

  const filterKeys = useMemo(() => Object.keys(defaultFilters) as (keyof F & string)[], [defaultFilters]);
  const filters = useMemo(() => {
    const result = {} as F;
    filterKeys.forEach((filterKey) => {
      result[filterKey] = (searchParams.get(k(filterKey)) ?? defaultFilters[filterKey]) as F[typeof filterKey];
    });
    return result;
  }, [searchParams, filterKeys, defaultFilters, k]);

  const update = useCallback(
    (updates: Record<string, string | null>, opts?: { resetPage?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([name, value]) => {
            const paramName = k(name);
            if (value === null || value === '') next.delete(paramName);
            else next.set(paramName, value);
          });
          if (opts?.resetPage) next.delete(k('page'));
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, k]
  );

  return {
    page,
    search,
    sortBy,
    sortOrder,
    filters,
    setPage: (p: number) => update({ page: p > 1 ? String(p) : null }),
    setSearch: (value: string) => update({ search: value || null }, { resetPage: true }),
    setSort: (newSortBy: string, newSortOrder: CatalogSortOrder = 'asc') =>
      update({
        sort_by: newSortBy === defaultSortBy ? null : newSortBy,
        sort_order: newSortOrder === defaultSortOrder ? null : newSortOrder,
      }),
    setFilter: (filterKey: keyof F & string, value: string) =>
      update({ [filterKey]: value || null }, { resetPage: true }),
    reset: () =>
      update(
        Object.fromEntries(
          [...filterKeys, 'search', 'page', 'sort_by', 'sort_order'].map((name) => [name, null])
        )
      ),
  };
}
