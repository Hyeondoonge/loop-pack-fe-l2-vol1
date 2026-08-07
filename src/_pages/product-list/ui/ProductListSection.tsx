'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import SearchInput from './SearchInput';
import ProductGridSkeleton from './ProductGridSkeleton';
import { useProductListFilters } from '../model/useProductListFilters';
import { CATEGORY_OPTIONS, PRODUCT_PAGE_SIZE, SORT_OPTIONS } from '../model/productListConstants';
import { resolvePageOverflow } from '../lib/resolvePageOverflow';
import { productQueries } from '../api/productQueries';
import { ApiError } from '@/shared/api/apiFetch';
import { ProductCardWithActions } from '@/widgets/product-card';
import type { CategoryId, Product, ProductSort } from '@/entities/product';

interface ProductResultsProps {
  products: Product[];
  page: number;
  totalPages: number;
  isStale: boolean;
  onPageChange: (value: number) => void;
}

// AI 생성: 설계 문서에 옵션 라벨 맵이 없어 직접 정의한다.
const SORT_LABELS: Record<(typeof SORT_OPTIONS)[number], string> = {
  latest: '최신순',
  popular: '인기순',
  'price-asc': '가격 낮은순',
  'price-desc': '가격 높은순'
};

// AI 생성: <select>의 onChange가 넘겨주는 값은 string이라 그대로 세터에 전달할 수 없다. 프로젝트가 as 단언을 금지하므로 타입 가드로 좁힌다.
function isCategoryOption(value: string): value is CategoryId | 'all' {
  return CATEGORY_OPTIONS.some((option) => option === value);
}

// AI 생성: 위와 같은 이유로 정렬 값도 타입 가드로 좁힌다.
function isSortOption(value: string): value is ProductSort {
  return SORT_OPTIONS.some((option) => option === value);
}

interface ProductResultsErrorProps {
  error: unknown;
  isFetching: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
}

// AI 생성: 서버 상태 코드로 두 갈래를 가른다. 4xx는 재요청해도 같은 실패가 반복되므로
// 재시도 버튼 대신 필터를 기본값으로 되돌리는 복구 행동을 준다. 5xx·네트워크 예외는
// 일시 장애로 보고 재시도 버튼을 준다.
function ProductResultsError({ error, isFetching, onRetry, onResetFilters }: ProductResultsErrorProps) {
  const isClientError = error instanceof ApiError && error.status < 500;
  const message = error instanceof ApiError ? error.message : '상품 목록을 불러오지 못했습니다.';

  if (isClientError) {
    return (
      <div>
        <p>{message}</p>
        <button type="button" onClick={onResetFilters}>
          필터 초기화
        </button>
      </div>
    );
  }

  return (
    <div>
      <p>{message}</p>
      <button type="button" disabled={isFetching} onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}

function ProductResults({ products, page, totalPages, isStale, onPageChange }: ProductResultsProps) {
  if (products.length === 0) {
    // AI 생성: 빈 결과 안내 문구. 로딩/에러 화면과 구분되도록 별도 문구를 쓴다.
    return (
      <div>
        <p>검색 결과가 없습니다.</p>
        <p>다른 검색어나 카테고리를 선택해 보세요.</p>
      </div>
    );
  }

  return (
    <>
      {/* AI 생성: 갱신 중이거나 갱신에 실패했을 때 목록을 흐리게 해 최신 결과가 아님을 알린다.
          opacity는 레이아웃에 영향을 주지 않는 속성이라 이 표시가 CLS를 만들지 않는다. */}
      <div className={isStale ? 'product-grid is-stale' : 'product-grid'}>
        {products.map((product) => (
          <ProductCardWithActions key={product.id} product={product} headingLevel="h2" />
        ))}
      </div>
      <nav className="pagination" aria-label="페이지 이동">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          이전
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          다음
        </button>
      </nav>
    </>
  );
}

export default function ProductListSection() {
  const { filters, setQuery, setCategory, setSort, setPage, correctPage, resetFilters } = useProductListFilters();

  // AI 생성: ESLint id-denylist 규칙이 식별자 data를 금지해서 productList로 이름을 바꿔 구조분해한다.
  // isPending: 이 필터 조합의 캐시가 아직 한 번도 없음(첫 로딩). isPlaceholderData: keepPreviousData로
  // 이전 필터의 결과를 보여주는 중(전환 중) — 에러는 Suspense 밖 useQuery라 여기서 값으로 받는다.
  const { data: productList, isPending, isPlaceholderData, isError, error, isFetching, refetch } = useQuery(productQueries.list(filters));

  // 페이지 초과 보정: 외부 시스템(브라우저 히스토리 = URL)에 쓰는 동기화이므로 useEffect가 맞다.
  // 파생값을 state로 복사하는 용도가 아니어서 프로젝트의 effect 금지 규칙에 해당하지 않는다.
  // AI 생성: isPlaceholderData 중엔 productList가 "이전 필터"의 응답이라 그 totalCount로 최신 filters.page를
  // 판단하면 안 된다(아직 도착하지 않은 페이지를 옛 응답 기준으로 잘못 교정). 에러·첫 로딩(productList 없음)도 건너뛴다.
  // AI 생성: 갱신 실패로 이전 조건의 목록을 유지하는 중에도 그 응답의 totalCount로 현재 page를
  // 교정하면 안 된다(화면에 남은 값은 지금 URL 조건의 결과가 아니다). isError도 함께 건너뛴다.
  useEffect(() => {
    if (!productList || isPlaceholderData || isError) return;
    const corrected = resolvePageOverflow(filters.page, productList.totalCount, productList.pageSize);
    if (corrected !== null) correctPage(corrected);
  }, [filters.page, productList, isPlaceholderData, isError, correctPage]);

  function handleCategoryChange(value: string) {
    if (isCategoryOption(value)) setCategory(value);
  }

  function handleSortChange(value: string) {
    if (isSortOption(value)) setSort(value);
  }

  const totalPages = productList ? Math.ceil(productList.totalCount / productList.pageSize) : 0;
  // AI 생성: isPending은 "이 필터 조합의 데이터가 아직 없다"(최초 진입), isFetching은 "요청이 진행 중"이다.
  // 최초 진입은 아래에서 스켈레톤이 따로 담당하므로 여기서는 이미 목록이 있는 상태의 갱신만 가린다.
  const isUpdating = isFetching && !isPending;
  const statusNote = isUpdating ? ' · 갱신 중' : isError ? ' · 갱신 실패' : '';

  return (
    <main className="page-container">
      <section className="content-section">
        <h1>상품 목록</h1>
        <div className="product-filters">
          <SearchInput key={filters.q} defaultValue={filters.q} onSubmit={setQuery} />
          <label>
            카테고리
            {/* AI 생성: 결과 쿼리 실패·첫 로딩 시 productList.categories가 없다. 필터 영역은 항상 렌더해야
            하므로(에러여도 사용자가 갇히지 않게) 이때는 '전체' 하나만 두고 select를 비활성화한다. */}
            <select name="category" value={filters.category} disabled={!productList} onChange={(event) => handleCategoryChange(event.target.value)}>
              {/* AI 생성: client-state-design.md 12번 — 'all'은 서버 categories에 없는 필터 개념이라 client가 붙이는 합성 옵션. 나머지 라벨은 서버 응답(productList.categories)에서 그린다. */}
              <option value="all">전체</option>
              {productList?.categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            정렬
            <select name="sort" value={filters.sort} onChange={(event) => handleSortChange(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option value={option} key={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="content-section" aria-label="상품 검색 결과" aria-busy={isFetching}>
        {/* AI 생성: isError를 먼저 보지 않고 productList 유무를 먼저 본다. react-query는 갱신에 실패해도
            마지막 성공 데이터를 지우지 않으므로, 목록이 남아 있으면 유지한 채 실패를 알리고, 목록이
            없는 실패(최초 실패)만 전체 에러 화면으로 대체한다. */}
        {isPending ? (
          <ProductGridSkeleton count={PRODUCT_PAGE_SIZE} />
        ) : !productList ? (
          <ProductResultsError error={error} isFetching={isFetching} onRetry={() => void refetch()} onResetFilters={resetFilters} />
        ) : (
          <>
            <p className="product-list-status">
              <span>
                총 {productList.totalCount}개{statusNote}
              </span>
              {isError && (
                <button type="button" disabled={isFetching} onClick={() => void refetch()}>
                  다시 시도
                </button>
              )}
            </p>
            <ProductResults products={productList.products} page={filters.page} totalPages={totalPages} isStale={isUpdating || isError} onPageChange={setPage} />
          </>
        )}
      </section>
    </main>
  );
}
