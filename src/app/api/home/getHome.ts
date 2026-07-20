// AI 생성
import { apiFetch } from '@/app/api/apiFetch';
import type { HomeResponse } from '@/types/commerce';

export function getHome(): Promise<HomeResponse> {
  return apiFetch('/api/home');
}
