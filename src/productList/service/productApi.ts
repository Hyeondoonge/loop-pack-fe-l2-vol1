import type { Product, ProductListResponse, SortBy } from '../types';

export const PAGE_SIZE = 12;

export type ProductQuery = {
  category: 'all' | Product['category'];
  minPrice: number | '';
  maxPrice: number | '';
  inStockOnly: boolean;
  sortBy: SortBy;
  searchQuery: string;
  page: number;
};

export async function fetchProducts({ category, minPrice, maxPrice, inStockOnly, sortBy, searchQuery, page }: ProductQuery): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    category,
    sort: sortBy,
    q: searchQuery,
    page: String(page),
    size: String(PAGE_SIZE)
  });
  if (minPrice !== '') params.set('minPrice', String(minPrice));
  if (maxPrice !== '') params.set('maxPrice', String(maxPrice));
  if (inStockOnly) params.set('inStock', 'true');

  const res = await fetch(`/api/products?${params.toString()}`);
  if (!res.ok) throw new Error(`API 호출 실패 (status: ${res.status})`);
  return res.json();
}
