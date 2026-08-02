import type { CategoryId, ProductSort } from '@/entities/product';

export const CATEGORY_OPTIONS = ['all', 'casual', 'fashion', 'goods', 'home', 'digital'] as const satisfies readonly (CategoryId | 'all')[];
export const SORT_OPTIONS = ['latest', 'popular', 'price-asc', 'price-desc'] as const satisfies readonly ProductSort[];
export const PRODUCT_PAGE_SIZE = 12;
export const FIRST_PAGE = 1;
