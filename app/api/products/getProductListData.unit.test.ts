import { describe, expect, it, vi } from 'vitest';
import { getProductListData } from './getProductListData';

const baseQuery = { q: '', category: null, sort: null, page: 1, pageSize: 12 } as const;

function buildProduct(overrides: { id: string; rating: number; reviewCount: number }) {
  return {
    id: overrides.id,
    brand: 'Loopers Select',
    name: overrides.id,
    category: 'casual' as const,
    price: 1000,
    originalPrice: null,
    image: '',
    freeShipping: false,
    sizes: [],
    rating: overrides.rating,
    reviewCount: overrides.reviewCount,
    createdAt: '2026-01-01T00:00:00.000Z'
  };
}

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

  it('sorts popular by rating when reviewCount is tied, even when input order needs a swap', async () => {
    vi.resetModules();
    vi.doMock('../_data/commerce', () => ({
      categories: [],
      products: [buildProduct({ id: 'low', rating: 4.0, reviewCount: 100 }), buildProduct({ id: 'high', rating: 4.9, reviewCount: 100 })]
    }));

    const { getProductListData: getProductListDataWithFixture } = await import('./getProductListData');
    const result = getProductListDataWithFixture({ ...baseQuery, sort: 'popular' });

    expect(result.products.map((product) => product.id)).toEqual(['high', 'low']);

    vi.doUnmock('../_data/commerce');
    vi.resetModules();
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
