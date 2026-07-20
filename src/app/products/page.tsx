import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ProductListSection from '@/productList/ProductListSection';

export default function ProductsPage() {
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
        <ProductListSection />
      </Suspense>
    </ErrorBoundary>
  );
}
