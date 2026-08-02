// AI 생성
import { apiFetch } from '@/shared/api/apiFetch';
// AI 생성: mock 백엔드(루트 app/api)는 FSD 레이어 밖 외부 시스템 대역이라 @/* alias(=./src/*) 밖이다.
// 상대 경로가 그대로 예외임을 드러내므로 편의를 위한 alias를 추가하지 않는다.
import { getHomeData } from '../../../../app/api/home/getHomeData';
import type { Category, Product } from '@/entities/product';

export type HomeResponse = {
  banner: { title: string; description: string; image: string };
  categories: Category[];
  popularProducts: Product[];
  newProducts: Product[];
};

// AI 생성: docs/work/week-05/ssr-fetch-fix-plan.md — 서버 렌더링 중에는 자기 Route Handler를
// HTTP(상대경로)로 재호출하지 않고 조회 함수를 직접 호출한다. 클라이언트는 기존대로 상대경로 fetch.
export function getHome(): Promise<HomeResponse> {
  if (typeof window === 'undefined') {
    return Promise.resolve(getHomeData());
  }
  return apiFetch('/api/home');
}
