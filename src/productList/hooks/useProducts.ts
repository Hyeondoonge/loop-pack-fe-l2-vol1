import { useState, useEffect, useCallback } from 'react';
import type { Product, SortBy } from '../types';
import { fetchProducts, type ProductQuery } from '../service/productApi';

export type { Product, SortBy };

const MAX_RETRIES = 3;

export function useProducts({ category, minPrice, maxPrice, inStockOnly, sortBy, searchQuery, page }: ProductQuery) {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchProducts({ category, minPrice, maxPrice, inStockOnly, sortBy, searchQuery, page });
      setProducts(data.products);
      setTotalCount(data.totalCount);
      setRetryCount(0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [category, minPrice, maxPrice, inStockOnly, sortBy, searchQuery, page]);

  // 쿼리(필터·검색어·페이지 등)가 바뀌면 새 요청이므로 재시도 횟수도 함께 리셋한다.
  useEffect(() => {
    setRetryCount(0);
    load();
  }, [load]);

  const canRetry = error !== null && retryCount < MAX_RETRIES;
  const retry = () => {
    if (!canRetry) return;
    setRetryCount((count) => count + 1);
    load();
  };

  return { products, totalCount, isLoading, error, retry, canRetry };
}
