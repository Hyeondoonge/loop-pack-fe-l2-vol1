'use client';

import { useCallback } from 'react';
import { useQueryStates } from 'nuqs';
import { productListParsers } from './productListFilters';
import { FIRST_PAGE } from './productListConstants';
import type { ProductListFilters } from '@/_pages/product-list/api/productQueries';
import type { CategoryId, ProductSort } from '@/entities/product/model/types';

type UseProductListFiltersResult = {
  filters: ProductListFilters;
  setQuery: (value: string) => void;
  setCategory: (value: CategoryId | 'all') => void;
  setSort: (value: ProductSort) => void;
  setPage: (value: number) => void;
  correctPage: (value: number) => void;
  resetFilters: () => void;
};

export function useProductListFilters(): UseProductListFiltersResult {
  const [filters, setFilters] = useQueryStates(productListParsers, { history: 'push', clearOnDefault: false });

  // AI 생성: nuqs 세터가 반환하는 Promise를 의도적으로 무시하려고 void 연산자를 사용한다 (@typescript-eslint/no-floating-promises 대응)
  const setQuery = useCallback((value: string) => void setFilters({ q: value, page: FIRST_PAGE }), [setFilters]);
  const setCategory = useCallback((value: CategoryId | 'all') => void setFilters({ category: value, page: FIRST_PAGE }), [setFilters]);
  const setSort = useCallback((value: ProductSort) => void setFilters({ sort: value, page: FIRST_PAGE }), [setFilters]);
  const setPage = useCallback((value: number) => void setFilters({ page: value }), [setFilters]);
  const correctPage = useCallback((value: number) => void setFilters({ page: value }, { history: 'replace' }), [setFilters]);
  // AI 생성: 4xx 에러의 복구 행동. null을 넘기면 nuqs가 모든 키를 parser 기본값으로 되돌린다(전체 초기화이므로 push).
  const resetFilters = useCallback(() => void setFilters(null), [setFilters]);

  return { filters, setQuery, setCategory, setSort, setPage, correctPage, resetFilters };
}
