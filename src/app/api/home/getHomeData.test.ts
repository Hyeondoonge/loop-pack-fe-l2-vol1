import { describe, expect, it } from 'vitest';
import { getHomeData } from './getHomeData';

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

  it('keeps banner and categories in the empty scenario', () => {
    const result = getHomeData('empty');

    expect(result.banner).toBeDefined();
    expect(result.categories).toHaveLength(5);
    expect(result.popularProducts).toEqual([]);
    expect(result.newProducts).toEqual([]);
  });
});
