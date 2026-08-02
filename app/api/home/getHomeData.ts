// AI 생성: route.ts의 데이터 계산 로직을 순수 함수로 분리. SSR 시 서버가 자기 Route Handler를
// HTTP로 재호출하지 않고 이 함수를 직접 호출하기 위함(docs/work/week-05/ssr-fetch-fix-plan.md).
// scenario 유효성 검증과 목업 지연(waitForMockApi)은 HTTP 경계인 route.ts 책임으로 남긴다.
import { categories, homeBanner, products } from '../_data/commerce';
import type { HomeResponse, MockApiScenario } from '@/types/commerce';

export function getHomeData(scenario?: MockApiScenario | null): HomeResponse {
  const popularProducts = [...products].sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating).slice(0, 6);
  const newProducts = [...products].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6);

  return {
    banner: homeBanner,
    categories,
    popularProducts: scenario === 'empty' ? [] : popularProducts,
    newProducts: scenario === 'empty' ? [] : newProducts
  };
}
