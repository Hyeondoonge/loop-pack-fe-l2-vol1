import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs';
import type { CategoryId, ProductSort } from '@/types/commerce';

export const CATEGORY_OPTIONS = ['all', 'casual', 'fashion', 'goods', 'home', 'digital'] as const satisfies readonly (CategoryId | 'all')[];
export const SORT_OPTIONS = ['latest', 'popular', 'price-asc', 'price-desc'] as const satisfies readonly ProductSort[];

export const productListParsers = {
  q: parseAsString.withDefault(''),
  category: parseAsStringLiteral(CATEGORY_OPTIONS).withDefault('all'),
  sort: parseAsStringLiteral(SORT_OPTIONS).withDefault('latest'),
  page: parseAsInteger.withDefault(1)
};
