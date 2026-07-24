// AI 생성
import { apiFetch } from '@/app/api/apiFetch';
import { getHomeData } from '@/app/api/home/getHomeData';
import type { HomeResponse } from '@/types/commerce';

// AI 생성: docs/work/week-05/ssr-fetch-fix-plan.md — 서버 렌더링 중에는 자기 Route Handler를
// HTTP(상대경로)로 재호출하지 않고 조회 함수를 직접 호출한다. 클라이언트는 기존대로 상대경로 fetch.
export function getHome(): Promise<HomeResponse> {
  if (typeof window === 'undefined') {
    return Promise.resolve(getHomeData());
  }
  return apiFetch('/api/home');
}
