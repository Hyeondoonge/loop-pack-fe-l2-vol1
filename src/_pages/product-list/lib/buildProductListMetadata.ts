import { OG_FALLBACK_IMAGE } from '@/shared/config/siteMetadata';
import { FIRST_PAGE, SORT_LABELS } from '../model/productListConstants';
import type { Category, CategoryId, Product, ProductSort } from '@/entities/product';

type ProductListMetadataFilters = {
  q: string;
  category: CategoryId | 'all';
  sort: ProductSort;
  page: number;
};

type ProductListMetadataSource = {
  products: readonly Pick<Product, 'image'>[];
  categories: readonly Category[];
  totalCount: number;
};

export function buildProductListMetadata(filters: ProductListMetadataFilters, source: ProductListMetadataSource): { title: string; description: string; ogImage: string } {
  const trimmedQuery = filters.q.trim();
  const categoryName = filters.category === 'all' ? '전체' : (source.categories.find((category) => category.id === filters.category)?.name ?? filters.category);
  const sortLabel = SORT_LABELS[filters.sort];

  const base = trimmedQuery ? `'${trimmedQuery}' 검색 결과` : '상품 목록';
  const title = filters.page > FIRST_PAGE ? `${base} (${filters.page}페이지)` : base;
  const description = [trimmedQuery && `'${trimmedQuery}'`, categoryName, sortLabel, `총 ${source.totalCount}개`].filter(Boolean).join(' · ');
  const ogImage = source.products[0]?.image ?? OG_FALLBACK_IMAGE;

  return { title, description, ogImage };
}
