// AI 생성
import { queryOptions } from '@tanstack/react-query';
import { getHome } from '@/app/api/home/getHome';

export const homeQueries = {
  all: () => ['home'] as const,
  detail: () =>
    queryOptions({
      queryKey: [...homeQueries.all(), 'detail'],
      queryFn: getHome
    })
};
