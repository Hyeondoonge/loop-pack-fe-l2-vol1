import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { createLoader } from 'nuqs/server';
import ProductListSection from '@/productList/ProductListSection';
import { getQueryClient } from '@/app/getQueryClient';
import { productQueries } from '@/app/api/products/productQueries';
import { productListParsers } from '@/productList/productListFilters';

// AI 생성: docs/work/week-05/ssr-fetch-fix-plan.md — nuqs 클라이언트 훅(useQueryStates)은 Next의
// 동적 렌더링을 유발하지 않아 기본적으로 이 페이지가 정적 생성(Static) 대상이 된다. 그러면 서버 렌더가
// searchParams를 읽지 못해 항상 기본 필터(page=1 등) 데이터만 담긴다. URL 필터에 맞는 서버 렌더를 위해
// 동적 렌더링을 강제한다(홈 page.tsx와 동일).
export const dynamic = 'force-dynamic';

// AI 생성: 클라이언트 useProductListFilters와 동일한 productListParsers로 searchParams를 파싱해야
// 서버·클라이언트 쿼리 키가 일치한다(키가 어긋나면 hydration이 캐시 miss로 조용히 실패한다).
const loadProductListFilters = createLoader(productListParsers);

// AI 생성: 이 Next.js 버전에서 searchParams는 Promise다. 위 loader로 파싱해 URL 필터에 맞는 목록을
// 서버에서 미리 채운 뒤 dehydrate하여 클라이언트로 넘긴다.
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = await loadProductListFilters(searchParams);

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(productQueries.list(filters));

  return (
    // AI 생성: 로딩·에러 폴백 문구. 빈 결과 화면과 눈으로 구분되도록 서로 다른 문구를 쓴다.
    <ErrorBoundary
      fallback={
        <main>
          <p>상품 목록을 불러오지 못했습니다.</p>
          <p>잠시 후 다시 시도해 주세요.</p>
        </main>
      }
    >
      <Suspense
        fallback={
          <main>
            <p>상품 목록을 불러오는 중입니다...</p>
          </main>
        }
      >
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProductListSection />
        </HydrationBoundary>
      </Suspense>
    </ErrorBoundary>
  );
}
