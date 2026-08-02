import { PRODUCT_PAGE_SIZE } from '@/productList/productListConstants';
import type { CategoryId, ProductListQuery, ProductSort } from '@/types/commerce';

export function toProductListQuery(filters: { q: string; category: CategoryId | 'all'; sort: ProductSort; page: number }): ProductListQuery {
  return {
    q: filters.q.trim().toLocaleLowerCase('ko'),
    category: filters.category,
    sort: filters.sort,
    page: filters.page,
    pageSize: PRODUCT_PAGE_SIZE
  };
}
