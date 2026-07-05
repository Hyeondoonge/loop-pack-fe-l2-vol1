import { useState, useEffect } from 'react';
import type { Product, SortBy } from '../types';
import { fetchProducts, type ProductQuery } from '../service/productApi';

export type { Product, SortBy };

export function useProducts({ category, minPrice, maxPrice, inStockOnly, sortBy, searchQuery, page }: ProductQuery) {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchProducts({ category, minPrice, maxPrice, inStockOnly, sortBy, searchQuery, page });
        setProducts(data.products);
        setTotalCount(data.totalCount);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, [category, minPrice, maxPrice, inStockOnly, sortBy, searchQuery, page]);

  return { products, totalCount, isLoading, error };
}
