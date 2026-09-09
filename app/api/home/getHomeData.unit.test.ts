import { describe, expect, it, vi } from 'vitest';
import { getHomeData } from './getHomeData';

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

describe('getHomeData', () => {
  it('returns banner, categories, popular products, and new products', () => {
    const result = getHomeData();

    expect(result.banner).toEqual({
      title: '매일 새롭게 발견하는 취향',
      description: '지금 가장 사랑받는 상품을 만나보세요.',
      image: '/images/products/p6.jpg'
    });
    expect(result.categories).toEqual([
      { id: 'casual', name: '캐주얼' },
      { id: 'fashion', name: '패션' },
      { id: 'goods', name: '뷰티·잡화' },
      { id: 'home', name: '홈' },
      { id: 'digital', name: '디지털' }
    ]);
    expect(result.popularProducts.map((product) => product.id)).toEqual(['p21', 'p11', 'p15', 'p8', 'p22', 'p30']);
    expect(result.newProducts.map((product) => product.id)).toEqual(['p26', 'p6', 'p27', 'p24', 'p1', 'p28']);
  });

  it('sorts popular products by rating when reviewCount is tied, even when input order needs a swap', async () => {
    vi.resetModules();
    vi.doMock('../_data/commerce', () => ({
      categories: [],
      homeBanner: { title: '', description: '', image: '' },
      products: [buildProduct({ id: 'low', rating: 4.0, reviewCount: 100 }), buildProduct({ id: 'high', rating: 4.9, reviewCount: 100 })]
    }));

    const { getHomeData: getHomeDataWithFixture } = await import('./getHomeData');
    const result = getHomeDataWithFixture();

    expect(result.popularProducts.map((product) => product.id)).toEqual(['high', 'low']);

    vi.doUnmock('../_data/commerce');
    vi.resetModules();
  });

  it('keeps banner and categories in the empty scenario', () => {
    const result = getHomeData('empty');

    expect(result.banner).toBeDefined();
    expect(result.categories).toHaveLength(5);
    expect(result.popularProducts).toEqual([]);
    expect(result.newProducts).toEqual([]);
  });
});
