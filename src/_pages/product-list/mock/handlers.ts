// /api/products 기본 핸들러 — 성공 경로만 담는다. 빈 결과·에러·지연과 조건별 응답은
// 각 테스트가 server.use()로 덮는다(결정 2 개정).
import { http, HttpResponse } from 'msw';
import { DEFAULT_PRODUCT_LIST } from './products';

// jsdom의 기본 origin. apiFetch는 브라우저 환경에서 상대 경로로 요청하므로 여기에 붙어 해석된다.
export const PRODUCT_LIST_ENDPOINT = 'http://localhost:3000/api/products';

export const productListHandlers = [http.get(PRODUCT_LIST_ENDPOINT, () => HttpResponse.json(DEFAULT_PRODUCT_LIST))];
