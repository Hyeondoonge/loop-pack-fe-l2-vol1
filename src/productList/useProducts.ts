import { useState, useEffect } from 'react';
import type { Product, ProductListResponse, SortBy } from './types';

export type { Product, SortBy };

export const PAGE_SIZE = 12;

type UseProductsParams = {
  category: 'all' | Product['category'];
  minPrice: number | '';
  maxPrice: number | '';
  sortBy: SortBy;
  searchQuery: string;
  page: number;
};

export function useProducts({ category, minPrice, maxPrice, sortBy, searchQuery, page }: UseProductsParams) {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        category,
        sort: sortBy,
        q: searchQuery,
        page: String(page),
        size: String(PAGE_SIZE)
      });
      if (minPrice !== '') params.set('minPrice', String(minPrice));
      if (maxPrice !== '') params.set('maxPrice', String(maxPrice));
      try {
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error(`API 호출 실패 (status: ${res.status})`);
        const data: ProductListResponse = await res.json();
        setProducts(data.products); // inStockOnly 필터 제거 — 렌더 파생으로 이동
        setTotalCount(data.totalCount);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [category, minPrice, maxPrice, sortBy, searchQuery, page]); // inStockOnly 제거

  return { products, totalCount, isLoading, error };
}
