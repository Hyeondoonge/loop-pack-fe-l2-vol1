import type { CategoryId, ProductListQuery, ProductSort } from '@/types/commerce';

export const PRODUCT_PAGE_SIZE = 12;

export function toProductListQuery(filters: { q: string; category: CategoryId | 'all'; sort: ProductSort; page: number }): ProductListQuery {
  return {
    q: filters.q.trim().toLocaleLowerCase('ko'),
    category: filters.category,
    sort: filters.sort,
    page: Math.max(1, filters.page),
    pageSize: PRODUCT_PAGE_SIZE
  };
}
