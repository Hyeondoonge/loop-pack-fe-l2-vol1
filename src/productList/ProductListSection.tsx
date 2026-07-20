'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';
import SearchInput from '@/productList/SearchInput';
import { useProductListFilters } from '@/productList/hooks/useProductListFilters';
import { CATEGORY_OPTIONS, SORT_OPTIONS } from '@/productList/productListFilters';
import { resolvePageOverflow } from '@/productList/resolvePageOverflow';
import { productQueries } from '@/app/api/products/productQueries';
import type { CategoryId, Product, ProductSort } from '@/types/commerce';
import '@/examples/week-05-layout/week-05-layout.css';

interface ProductResultsProps {
  products: Product[];
  page: number;
  totalPages: number;
  onPageChange: (value: number) => void;
}

// AI 생성: 설계 문서에 옵션 라벨 맵이 없어 직접 정의한다. 카테고리 라벨은 ProductListLayoutExample.tsx의 문구를 그대로 옮겼다.
const CATEGORY_LABELS: Record<(typeof CATEGORY_OPTIONS)[number], string> = {
  all: '전체',
  casual: '캐주얼',
  fashion: '패션',
  goods: '뷰티·잡화',
  home: '홈',
  digital: '디지털'
};

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
      <div className="week05-grid">
        {products.map((product) => (
          <article className="week05-product" key={product.id}>
            <Image className="week05-image" src={product.image} alt={product.name} width={400} height={400} />
            <p>{product.brand}</p>
            <h2>{product.name}</h2>
            <strong>{product.price.toLocaleString()}원</strong>
            {/* AI 생성: 찜/담기 버튼은 다음 단계(Zustand 전역 상태)에서 연결할 자리 표시용이다. 예시 레이아웃 그대로 두고 핸들러를 붙이지 않는다. */}
            <div>
              <button type="button" aria-label={`${product.name} 위시리스트`} aria-pressed={false}>
                찜
              </button>
              <button type="button" aria-label={`${product.name} 장바구니`} aria-pressed={false}>
                담기
              </button>
            </div>
          </article>
        ))}
      </div>
      <nav className="week05-pagination" aria-label="페이지 이동">
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
  const { filters, setQuery, setCategory, setSort, setPage, correctPage } = useProductListFilters();
  // AI 생성: ESLint id-denylist 규칙이 식별자 data를 금지해서 productList로 이름을 바꿔 구조분해한다.
  const { data: productList } = useSuspenseQuery(productQueries.list(filters));

  // 페이지 초과 보정: 외부 시스템(브라우저 히스토리 = URL)에 쓰는 동기화이므로 useEffect가 맞다.
  // 파생값을 state로 복사하는 용도가 아니어서 프로젝트의 effect 금지 규칙에 해당하지 않는다.
  useEffect(() => {
    const corrected = resolvePageOverflow(filters.page, productList.totalCount, productList.pageSize);
    if (corrected !== null) correctPage(corrected);
  }, [filters.page, productList.totalCount, productList.pageSize, correctPage]);

  function handleCategoryChange(value: string) {
    if (isCategoryOption(value)) setCategory(value);
  }

  function handleSortChange(value: string) {
    if (isSortOption(value)) setSort(value);
  }

  const totalPages = Math.ceil(productList.totalCount / productList.pageSize);

  return (
    <main className="week05-page">
      <header className="week05-header">
        <Link href="/">Commerce</Link>
        <nav aria-label="주요 메뉴">
          <Link href="/products">상품</Link>
        </nav>
      </header>
      <section className="week05-section">
        <h1>상품 목록</h1>
        <div className="week05-filters">
          <SearchInput key={filters.q} defaultValue={filters.q} onSubmit={setQuery} />
          <label>
            카테고리
            <select name="category" value={filters.category} onChange={(event) => handleCategoryChange(event.target.value)}>
              {CATEGORY_OPTIONS.map((option) => (
                <option value={option} key={option}>
                  {CATEGORY_LABELS[option]}
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
      <section className="week05-section" aria-label="상품 검색 결과">
        <p>총 {productList.totalCount}개</p>
        <ProductResults products={productList.products} page={filters.page} totalPages={totalPages} onPageChange={setPage} />
      </section>
    </main>
  );
}
