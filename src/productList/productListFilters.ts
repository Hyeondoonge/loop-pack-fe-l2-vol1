import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs';
import { CATEGORY_OPTIONS, FIRST_PAGE, SORT_OPTIONS } from '@/productList/productListConstants';

export const productListParsers = {
  q: parseAsString.withDefault(''),
  category: parseAsStringLiteral(CATEGORY_OPTIONS).withDefault('all'),
  sort: parseAsStringLiteral(SORT_OPTIONS).withDefault('latest'),
  page: parseAsInteger.withDefault(FIRST_PAGE)
};
