import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import HomeSection from '@/home/HomeSection';
import { getQueryClient } from '@/shared/api/getQueryClient';
import { homeQueries } from '@/_pages/home/api/homeQueries';

// AI 생성: HomeSection이 apiFetch에 상대 경로('/api/home')를 넘긴다. Next.js는 실제 요청이 있을 때만
// fetch의 상대 경로를 요청 origin 기준으로 풀어준다 — `next build`의 정적 생성 단계는 요청 컨텍스트가 없어
// URL 파싱에 즉시 실패하고, 재시도 백오프가 걸리며 빌드가 60초 타임아웃으로 멈춘다. 동적 렌더링으로 두어
// 정적 생성 자체를 건너뛰고 실제 요청 시점에 렌더링하게 한다.
export const dynamic = 'force-dynamic';

// AI 생성: 서버에서 홈 쿼리를 미리 채운 뒤 dehydrate한 캐시를 클라이언트로 넘긴다. 이렇게 하면
// 클라이언트의 useSuspenseQuery가 첫 렌더에서 캐시 hit이 되어 Suspense 폴백으로 되돌아가는 깜빡임과
// 서버·클라이언트 중복 fetch가 사라진다.
export default async function Home() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(homeQueries.detail());

  return (
    // AI 생성: 로딩·에러 폴백 문구는 ProductsPage(products/page.tsx)와 같은 패턴을 따른다.
    <ErrorBoundary
      fallback={
        <main>
          <p>홈 정보를 불러오지 못했습니다.</p>
          <p>잠시 후 다시 시도해 주세요.</p>
        </main>
      }
    >
      <Suspense
        fallback={
          <main>
            <p>홈 정보를 불러오는 중입니다...</p>
          </main>
        }
      >
        <HydrationBoundary state={dehydrate(queryClient)}>
          <HomeSection />
        </HydrationBoundary>
      </Suspense>
    </ErrorBoundary>
  );
}
