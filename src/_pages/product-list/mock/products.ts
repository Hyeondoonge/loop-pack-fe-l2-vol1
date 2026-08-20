// 통합 테스트용 픽스처와 팩토리. 스텁이므로 여기 적힌 값이 곧 테스트의 기대값이다
// (결정 2 개정 — 핸들러는 서버 계산 로직을 부르지 않는다).
import { PRODUCT_PAGE_SIZE } from '../model/productListConstants';
import type { Category, Product, ProductListResponse } from '@/entities/product';

export const CATEGORIES: Category[] = [
  { id: 'casual', name: '캐주얼' },
  { id: 'fashion', name: '패션' },
  { id: 'goods', name: '뷰티·잡화' },
  { id: 'home', name: '홈' },
  { id: 'digital', name: '디지털' }
];

// 실제 시드가 아니라 테스트가 읽기 쉬운 최소 값으로 채운다. 단언에 쓰이는 필드(name·price·category)만
// 호출부에서 넘기고 나머지는 계약을 만족하는 기본값으로 둔다.
export function createProduct(overrides: Pick<Product, 'id' | 'name'> & Partial<Product>): Product {
  return {
    brand: '테스트 브랜드',
    category: 'casual',
    price: 10_000,
    originalPrice: null,
    image: `/images/${overrides.id}.jpg`,
    freeShipping: false,
    sizes: [{ value: 260, stock: 3 }],
    rating: 4.5,
    reviewCount: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

export function createProductListResponse(overrides: Partial<ProductListResponse> = {}): ProductListResponse {
  const products = overrides.products ?? DEFAULT_PAGE_PRODUCTS;
  return {
    categories: CATEGORIES,
    totalCount: products.length,
    page: 1,
    pageSize: PRODUCT_PAGE_SIZE,
    ...overrides,
    products
  };
}

// 기본 성공 응답이 싣는 한 페이지. 가격은 이름 순서와 반대로 두어 "정렬하지 않은 상태"가
// 가격 오름차순과 우연히 일치하지 않게 한다.
export const DEFAULT_PAGE_PRODUCTS: Product[] = [
  createProduct({ id: 'casual-tee', name: '데일리 코튼 티셔츠', category: 'casual', price: 29_000 }),
  createProduct({ id: 'casual-denim', name: '워시드 데님 팬츠', category: 'casual', price: 59_000 }),
  createProduct({ id: 'fashion-blazer', name: '오버핏 블레이저', category: 'fashion', price: 129_000 }),
  createProduct({ id: 'digital-buds', name: '무선 이어버드', category: 'digital', price: 89_000 }),
  createProduct({ id: 'home-diffuser', name: '우드 디퓨저', category: 'home', price: 19_000 }),
  createProduct({ id: 'goods-tote', name: '캔버스 토트백', category: 'goods', price: 39_000 })
];

export const DEFAULT_PRODUCT_LIST = createProductListResponse();
