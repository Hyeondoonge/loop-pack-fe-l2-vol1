// 통합 테스트용 픽스처. 스텁이므로 여기 적힌 값이 곧 테스트의 기대값이다
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

// 단언에 쓰이는 필드(name·price·category)만 호출부에서 넘기고 나머지는 계약을 만족하는 기본값으로 둔다.
export function createProduct(overrides: Pick<Product, 'id' | 'name'> & Partial<Product>): Product {
  return {
    brand: '테스트 브랜드',
    category: 'goods',
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

// 단언이 이름으로 지목하는 상품들. 가격이 서로 겹치지 않아 정렬 결과를 눈으로 확인할 수 있다.
export const COTTON_TEE = createProduct({ id: 'casual-tee', name: '데일리 코튼 티셔츠', category: 'casual', price: 29_000 });
export const DENIM_PANTS = createProduct({ id: 'casual-denim', name: '워시드 데님 팬츠', category: 'casual', price: 59_000 });
export const BLAZER = createProduct({ id: 'fashion-blazer', name: '오버핏 블레이저', category: 'fashion', price: 129_000 });
export const EARBUDS = createProduct({ id: 'digital-buds', name: '무선 이어버드', category: 'digital', price: 89_000 });
export const DIFFUSER = createProduct({ id: 'home-diffuser', name: '우드 디퓨저', category: 'home', price: 19_000 });
export const TOTE_BAG = createProduct({ id: 'goods-tote', name: '캔버스 토트백', category: 'goods', price: 39_000 });

// 한 페이지(12개)를 채우고 두 번째 페이지가 생기도록 총 14개를 만든다. 채움용 상품의 가격은
// 이름 지은 상품들 사이에 흩어져 정렬 단언이 우연히 통과하지 않게 한다.
const FILLER_PRODUCTS = Array.from({ length: 8 }, (_, index) => createProduct({ id: `filler-${index + 1}`, name: `기타 상품 ${index + 1}`, price: 45_000 + index * 1_000 }));

export const ALL_PRODUCTS: Product[] = [COTTON_TEE, DENIM_PANTS, BLAZER, EARBUDS, DIFFUSER, TOTE_BAG, ...FILLER_PRODUCTS];

const byPriceAscending = [...ALL_PRODUCTS].sort((left, right) => left.price - right.price);
const byPriceDescending = [...ALL_PRODUCTS].sort((left, right) => right.price - left.price);
const casualOnly = ALL_PRODUCTS.filter((product) => product.category === 'casual');

export function createProductListResponse(overrides: Partial<ProductListResponse> = {}): ProductListResponse {
  return {
    products: ALL_PRODUCTS.slice(0, PRODUCT_PAGE_SIZE),
    categories: CATEGORIES,
    totalCount: ALL_PRODUCTS.length,
    page: 1,
    pageSize: PRODUCT_PAGE_SIZE,
    ...overrides
  };
}

// 조건별 응답. 핸들러는 요청 조건으로 이 중 하나를 고르기만 한다.
export const PRODUCT_LIST_STUBS = {
  default: createProductListResponse(),
  secondPage: createProductListResponse({ products: ALL_PRODUCTS.slice(PRODUCT_PAGE_SIZE), page: 2 }),
  casual: createProductListResponse({ products: casualOnly, totalCount: casualOnly.length }),
  priceAscending: createProductListResponse({ products: byPriceAscending.slice(0, PRODUCT_PAGE_SIZE) }),
  priceDescending: createProductListResponse({ products: byPriceDescending.slice(0, PRODUCT_PAGE_SIZE) }),
  casualPriceDescending: createProductListResponse({
    products: [...casualOnly].sort((left, right) => right.price - left.price),
    totalCount: casualOnly.length
  }),
  empty: createProductListResponse({ products: [], totalCount: 0 })
};
