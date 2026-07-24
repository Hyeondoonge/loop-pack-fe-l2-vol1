// AI 생성
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // AI 생성: server-state-design.md 1번 "전역 default staleTime: 20s" 반영. 실시간 갱신이 필요한 쿼리는 개별적으로 오버라이드한다.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 20 * 1000 } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
