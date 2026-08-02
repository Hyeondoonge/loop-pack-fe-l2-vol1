'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import SearchInput from './SearchInput';
import { useProductListFilters } from '../model/useProductListFilters';
import { CATEGORY_OPTIONS, SORT_OPTIONS } from '../model/productListConstants';
import { resolvePageOverflow } from '../lib/resolvePageOverflow';
import { productQueries } from '../api/productQueries';
import { ApiError } from '@/shared/api/apiFetch';
import { formatPrice } from '@/shared/lib/formatPrice';
import ProductActions from '@/components/commerce/ProductActions/ProductActions';
import type { CategoryId, Product, ProductSort } from '@/entities/product/model/types';

interface ProductResultsProps {
  products: Product[];
  page: number;
  totalPages: number;
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

function ProductResults({ products, page, totalPages, onPageChange }: ProductResultsProps) {
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
      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <Image className="product-card-image" src={product.image} alt={product.name} width={400} height={400} />
            <p>{product.brand}</p>
            <h2>{product.name}</h2>
            <strong>{formatPrice(product.price)}</strong>
            <ProductActions productId={product.id} productLabel={product.name} />
          </article>
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
  useEffect(() => {
    if (!productList || isPlaceholderData) return;
    const corrected = resolvePageOverflow(filters.page, productList.totalCount, productList.pageSize);
    if (corrected !== null) correctPage(corrected);
  }, [filters.page, productList, isPlaceholderData, correctPage]);

  function handleCategoryChange(value: string) {
    if (isCategoryOption(value)) setCategory(value);
  }

  function handleSortChange(value: string) {
    if (isSortOption(value)) setSort(value);
  }

  const totalPages = productList ? Math.ceil(productList.totalCount / productList.pageSize) : 0;

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
      <section className="content-section" aria-label="상품 검색 결과" aria-busy={isPlaceholderData}>
        {isError ? (
          <ProductResultsError error={error} isFetching={isFetching} onRetry={() => void refetch()} onResetFilters={resetFilters} />
        ) : isPending ? (
          <p>상품 목록을 불러오는 중입니다...</p>
        ) : (
          <>
            <p>총 {productList.totalCount}개</p>
            <ProductResults products={productList.products} page={filters.page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </section>
    </main>
  );
}
