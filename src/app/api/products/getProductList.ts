// AI 생성
import { apiFetch } from '@/app/api/apiFetch';
import type { ProductListQuery, ProductListResponse } from '@/types/commerce';

function toSearchParams(query: ProductListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  return params.toString();
}

export function getProductList(query: ProductListQuery): Promise<ProductListResponse> {
  return apiFetch(`/api/products?${toSearchParams(query)}`);
}
