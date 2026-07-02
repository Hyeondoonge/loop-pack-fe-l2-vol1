import { useUrlSearchParams } from './useUrlSearchParams';
import type { Product, SortBy } from '../types';

const CATEGORY_VALUES: ('all' | Product['category'])[] = ['all', 'electronics', 'fashion', 'home', 'beauty'];
const SORT_VALUES: SortBy[] = ['latest', 'popular', 'price-asc', 'price-desc'];

function isCategory(value: string): value is 'all' | Product['category'] {
  return CATEGORY_VALUES.some((category) => category === value);
}

function isSortBy(value: string): value is SortBy {
  return SORT_VALUES.some((sort) => sort === value);
}

// URL 쿼리스트링을 상품 목록 필터 상태의 단일 출처로 사용하는 훅.
// state 없이 URL에서 값을 파생하고, 변경은 URLSearchParams patch로 반영한다.
// AI 생성 L18 - L56
export function useProductListParams() {
  const [params, setParams] = useUrlSearchParams();

  const rawCategory = params.get('category') ?? 'all';
  const category = isCategory(rawCategory) ? rawCategory : 'all';
  const searchQuery = params.get('q') ?? '';
  const page = Number(params.get('page')) || 1;
  const rawSort = params.get('sort') ?? 'latest';
  const sortBy = isSortBy(rawSort) ? rawSort : 'latest';
  const minPrice: number | '' = params.has('minPrice') ? Number(params.get('minPrice')) : '';
  const maxPrice: number | '' = params.has('maxPrice') ? Number(params.get('maxPrice')) : '';
  const inStockOnly = params.get('inStock') === 'true';

  const patch = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next);
  };
  const setDefault = (p: URLSearchParams, key: string, value: string, defaultValue: string) => (value === defaultValue ? p.delete(key) : p.set(key, value));

  return {
    category,
    searchQuery,
    page,
    sortBy,
    minPrice,
    maxPrice,
    inStockOnly,
    setCategory: (value: 'all' | Product['category']) =>
      patch((p) => {
        setDefault(p, 'category', value, 'all');
        p.delete('page');
      }),
    setSearchQuery: (value: string) =>
      patch((p) => {
        setDefault(p, 'q', value, '');
        p.delete('page');
      }),
    setSortBy: (value: SortBy) =>
      patch((p) => {
        setDefault(p, 'sort', value, 'latest');
        p.delete('page');
      }),
    setPage: (value: number) => patch((p) => setDefault(p, 'page', String(value), '1')),
    setMinPrice: (value: number | '') =>
      patch((p) => {
        setDefault(p, 'minPrice', String(value), '');
        p.delete('page');
      }),
    setMaxPrice: (value: number | '') =>
      patch((p) => {
        setDefault(p, 'maxPrice', String(value), '');
        p.delete('page');
      }),
    setInStockOnly: (value: boolean) =>
      patch((p) => {
        setDefault(p, 'inStock', String(value), 'false');
        p.delete('page');
      }),
    reset: () => setParams(new URLSearchParams())
  };
}
