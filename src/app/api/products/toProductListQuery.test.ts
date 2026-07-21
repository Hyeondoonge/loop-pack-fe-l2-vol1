import { describe, expect, it } from 'vitest';
import { PRODUCT_PAGE_SIZE } from '@/productList/productListConstants';
import { toProductListQuery } from './toProductListQuery';

describe('toProductListQuery', () => {
  it('trims surrounding whitespace and lowercases with the ko locale', () => {
    const result = toProductListQuery({ q: '  NIKE  ', category: 'all', sort: 'latest', page: 1 });
    expect(result.q).toBe('nike');
  });

  it('preserves internal whitespace between words', () => {
    const result = toProductListQuery({ q: '나이키  운동화', category: 'all', sort: 'latest', page: 1 });
    expect(result.q).toBe('나이키  운동화');
  });

  it('clamps page below 1 up to 1', () => {
    expect(toProductListQuery({ q: '', category: 'all', sort: 'latest', page: 0 }).page).toBe(1);
    expect(toProductListQuery({ q: '', category: 'all', sort: 'latest', page: -5 }).page).toBe(1);
  });

  it('passes category and sort through unchanged and sets the shared page size', () => {
    const result = toProductListQuery({ q: '', category: 'casual', sort: 'price-asc', page: 3 });
    expect(result.category).toBe('casual');
    expect(result.sort).toBe('price-asc');
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(PRODUCT_PAGE_SIZE);
  });
});
