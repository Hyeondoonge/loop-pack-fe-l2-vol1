'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useState } from 'react';
import { SessionExpiredError } from '@/shared/api/SessionExpiredError';
import { redirectToLogin } from './redirectToLogin';

const handleSessionExpired = (error: unknown): void => {
  if (error instanceof SessionExpiredError) redirectToLogin();
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 20 * 1000 } },
        queryCache: new QueryCache({ onError: handleSessionExpired }),
        mutationCache: new MutationCache({ onError: handleSessionExpired })
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
