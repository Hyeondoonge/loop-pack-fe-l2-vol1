// 통합 테스트 렌더 헬퍼. 프로바이더 조합을 한 곳에서만 관리하고, 렌더할 트리는 항목마다 고른다(결정 3).
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { NuqsAdapter } from 'nuqs/adapters/react';

// 재시도 정책 자체는 운영 값을 그대로 쓰고 대기 시간만 없앤다. retry: false로 끄면
// "5xx는 1회 재시도한다"를 바꾸는 변형을 테스트가 못 잡는다(결정 4).
// QueryClient는 렌더마다 새로 만들어 캐시가 다음 테스트로 넘어가지 않게 한다.
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } }
  });
}

interface RenderWithProvidersOptions {
  searchParams?: string;
  onUrlUpdate?: OnUrlUpdateFunction;
}

// URL 상태를 메모리로 흉내내는 기본 렌더. hasMemory를 켜지 않으면 어댑터가 초기 searchParams에
// 값을 고정해, 필터를 바꿔도 컴포넌트가 새 조건을 다시 읽지 못한다.
export function renderWithProviders(ui: ReactElement, { searchParams, onUrlUpdate }: RenderWithProvidersOptions = {}) {
  function Providers({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
        <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
      </NuqsTestingAdapter>
    );
  }

  return render(ui, { wrapper: Providers });
}

// 뒤로·앞으로 항목 전용. 테스트 어댑터는 history·location을 건드리지 않아 세션 히스토리 자체가 없다.
// nuqs/adapters/react는 history.pushState와 popstate 구독을 쓰는 운영과 같은 경로이고,
// jsdom이 그 경로를 whatwg-html 스펙대로 구현한다(docs/work/week-08/back-forward-test-design.md).
export function renderWithBrowserHistory(ui: ReactElement) {
  function Providers({ children }: { children: ReactNode }) {
    return (
      <NuqsAdapter>
        <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
      </NuqsAdapter>
    );
  }

  return render(ui, { wrapper: Providers });
}
