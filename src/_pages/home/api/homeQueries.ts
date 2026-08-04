// AI 생성: staleTime을 별도 지정하지 않아 providers.tsx의 전역 default(20s)를 그대로 쓴다.
// retry 정책은 server-state-design.md §2가 productQueries.list로 범위를 한정했지만,
// ApiError 상태 코드로 재시도 여부를 가르는 근거(4xx 즉시 실패)가 홈 쿼리에도 동일하게 적용돼 그대로 가져왔다.
import { queryOptions } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/apiFetch';
import { getHome } from './getHome';

export const homeQueries = {
  all: () => ['home'] as const,
  detail: () =>
    queryOptions({
      queryKey: [...homeQueries.all(), 'detail'],
      queryFn: getHome,
      retry: (failureCount, error) => failureCount < 3 && !(error instanceof ApiError && error.status < 500)
    })
};
