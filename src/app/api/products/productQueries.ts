import { queryOptions } from '@tanstack/react-query';
import { ApiError } from '@/app/api/apiFetch';
import { getProductList } from '@/app/api/products/getProductList';
import { toProductListQuery } from '@/app/api/products/toProductListQuery';
import type { CategoryId, ProductSort } from '@/types/commerce';

export type ProductListFilters = {
  q: string;
  category: CategoryId | 'all';
  sort: ProductSort;
  page: number;
};

export const productQueries = {
  all: () => ['product'] as const,
  list: (filters: ProductListFilters) => {
    const query = toProductListQuery(filters);
    return queryOptions({
      queryKey: [...productQueries.all(), 'list', query],
      queryFn: () => getProductList(query),
      retry: (failureCount, error) => failureCount < 3 && !(error instanceof ApiError && error.status < 500)
    });
  }
};
