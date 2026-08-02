// AI 생성
import { apiFetch } from '@/shared/api/apiFetch';
// AI 생성: mock 백엔드(루트 app/api)는 FSD 레이어 밖 외부 시스템 대역이라 @/* alias(=./src/*) 밖이다.
// 상대 경로가 그대로 예외임을 드러내므로 편의를 위한 alias를 추가하지 않는다.
import { getProductListData } from '../../../../app/api/products/getProductListData';
import { PRODUCT_PAGE_SIZE } from '../model/productListConstants';
import type { ProductListQuery, ProductListResponse } from '@/entities/product';

function toSearchParams(query: ProductListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  return params.toString();
}

// AI 생성: docs/work/week-05/ssr-fetch-fix-plan.md — 서버 렌더링 중에는 자기 Route Handler를
// HTTP(상대경로)로 재호출하지 않고 조회 함수를 직접 호출한다. 클라이언트는 기존대로 상대경로 fetch.
// query는 toProductListQuery에서 정규화(q trim/소문자, page clamp)를 거친 값이다.
export function getProductList(query: ProductListQuery): Promise<ProductListResponse> {
  if (typeof window === 'undefined') {
    return Promise.resolve(
      getProductListData({
        q: query.q ?? '',
        category: query.category ?? null,
        sort: query.sort ?? null,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? PRODUCT_PAGE_SIZE
      })
    );
  }
  return apiFetch(`/api/products?${toSearchParams(query)}`);
}
