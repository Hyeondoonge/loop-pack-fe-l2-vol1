import { describe, expect, it } from 'vitest';
import { getProductListData } from './getProductListData';

const baseQuery = { q: '', category: null, sort: null, page: 1, pageSize: 12 } as const;

describe('getProductListData', () => {
  it('paginates with totalCount over the full match set', () => {
    const result = getProductListData(baseQuery);

    expect(result.products).toHaveLength(12);
    expect(result.totalCount).toBe(30);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(12);
    expect(result.categories).toHaveLength(5);
  });

  it('sorts by latest createdAt when sort is given', () => {
    const result = getProductListData({ ...baseQuery, sort: 'latest' });

    expect(result.products[0].id).toBe('p26');
  });

  it('sorts popular by rating when reviewCount is tied', () => {
    const result = getProductListData({ ...baseQuery, sort: 'popular' });
    const ids = result.products.map((product) => product.id);

    expect(ids.indexOf('p22')).toBeLessThan(ids.indexOf('p30'));
  });

  it('filters by category', () => {
    const result = getProductListData({ ...baseQuery, category: 'digital' });

    expect(result.products.every((product) => product.category === 'digital')).toBe(true);
    expect(result.totalCount).toBe(6);
  });

  it('returns empty products and zero totalCount in the empty scenario', () => {
    const result = getProductListData({ ...baseQuery, scenario: 'empty' });

    expect(result.products).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
