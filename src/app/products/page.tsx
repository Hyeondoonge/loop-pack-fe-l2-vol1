import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { createLoader } from 'nuqs/server';
import ProductListSection from '@/productList/ProductListSection';
import { getQueryClient } from '@/app/getQueryClient';
import { productQueries } from '@/app/api/products/productQueries';
import { productListParsers } from '@/productList/productListFilters';

// AI 생성: 클라이언트 useProductListFilters와 동일한 productListParsers로 searchParams를 파싱해야
// 서버·클라이언트 쿼리 키가 일치한다(키가 어긋나면 hydration이 캐시 miss로 조용히 실패한다).
const loadProductListFilters = createLoader(productListParsers);

// AI 생성: 이 Next.js 버전에서 searchParams는 Promise다. 위 loader로 파싱해 URL 필터에 맞는 목록을
// 서버에서 미리 채운 뒤 dehydrate하여 클라이언트로 넘긴다. 로딩·에러는 ProductListSection이 결과
// 영역 단위로 처리하므로(필터 컨트롤은 항상 렌더) 여기서는 Suspense·ErrorBoundary 경계를 두지 않는다.
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = await loadProductListFilters(searchParams);

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(productQueries.list(filters));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductListSection />
    </HydrationBoundary>
  );
}
