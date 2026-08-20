// /api/products 기본 핸들러 — 성공 경로만 담는다. 빈 결과·에러·지연은 각 테스트가 server.use()로 덮는다.
// 스텁이라 요청 조건으로 미리 써둔 응답을 고르기만 하고, 필터·정렬·페이징을 직접 계산하지 않는다(결정 2 개정).
import { http, HttpResponse } from 'msw';
import { PRODUCT_LIST_STUBS } from './products';
import type { ProductListResponse } from '@/entities/product';

// jsdom의 기본 origin. apiFetch는 브라우저 환경에서 상대 경로로 요청하므로 여기에 붙어 해석된다.
export const PRODUCT_LIST_ENDPOINT = 'http://localhost:3000/api/products';

function toConditionKey(searchParams: URLSearchParams): string {
  const query = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const sort = searchParams.get('sort') ?? 'latest';
  const page = searchParams.get('page') ?? '1';
  return `q=${query}&category=${category}&sort=${sort}&page=${page}`;
}

// 조건이 요청에 실리지 않으면 다른 키가 되어 다른 응답(또는 미등록)으로 드러난다.
const RESPONSE_BY_CONDITION: Record<string, ProductListResponse> = {
  'q=&category=all&sort=latest&page=1': PRODUCT_LIST_STUBS.default,
  'q=&category=all&sort=latest&page=2': PRODUCT_LIST_STUBS.secondPage,
  'q=&category=casual&sort=latest&page=1': PRODUCT_LIST_STUBS.casual,
  'q=&category=all&sort=price-asc&page=1': PRODUCT_LIST_STUBS.priceAscending,
  'q=&category=all&sort=price-desc&page=1': PRODUCT_LIST_STUBS.priceDescending,
  'q=&category=casual&sort=price-desc&page=1': PRODUCT_LIST_STUBS.casualPriceDescending
};

export const productListHandlers = [
  http.get(PRODUCT_LIST_ENDPOINT, ({ request }) => {
    const key = toConditionKey(new URL(request.url).searchParams);
    const response = RESPONSE_BY_CONDITION[key];

    // 테스트가 아직 픽스처를 안 만든 조건이다. 조용히 빈 목록을 주면 원인을 찾기 어려워 즉시 실패시킨다.
    if (!response) throw new Error(`상품 목록 스텁에 등록되지 않은 조건입니다: ${key}`);

    return HttpResponse.json(response);
  })
];
