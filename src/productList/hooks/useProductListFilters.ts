'use client';

import { useCallback } from 'react';
import { useQueryStates } from 'nuqs';
import { productListParsers } from '@/productList/productListFilters';
import type { ProductListFilters } from '@/app/api/products/productQueries';
import type { CategoryId, ProductSort } from '@/types/commerce';

type UseProductListFiltersResult = {
  filters: ProductListFilters;
  setQuery: (value: string) => void;
  setCategory: (value: CategoryId | 'all') => void;
  setSort: (value: ProductSort) => void;
  setPage: (value: number) => void;
  correctPage: (value: number) => void;
};

export function useProductListFilters(): UseProductListFiltersResult {
  const [filters, setFilters] = useQueryStates(productListParsers, { history: 'push', clearOnDefault: false });

  // AI 생성: nuqs 세터가 반환하는 Promise를 의도적으로 무시하려고 void 연산자를 사용한다 (@typescript-eslint/no-floating-promises 대응)
  const setQuery = useCallback((value: string) => void setFilters({ q: value, page: 1 }), [setFilters]);
  const setCategory = useCallback((value: CategoryId | 'all') => void setFilters({ category: value, page: 1 }), [setFilters]);
  const setSort = useCallback((value: ProductSort) => void setFilters({ sort: value, page: 1 }), [setFilters]);
  const setPage = useCallback((value: number) => void setFilters({ page: value }), [setFilters]);
  const correctPage = useCallback((value: number) => void setFilters({ page: value }, { history: 'replace' }), [setFilters]);

  return { filters, setQuery, setCategory, setSort, setPage, correctPage };
}
