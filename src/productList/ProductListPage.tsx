import { useState, useEffect } from 'react';
import { useProducts, type Product, type SortBy } from './hooks/useProducts';
import { useProductListParams } from './hooks/useProductListParams';
import { useDebounceValue } from './hooks/useDebounceValue';
import { PAGE_SIZE } from './service/productApi';
import ProductCard from './components/ProductCard';
import Pagination from './components/Pagination';
import { useWishlist } from './hooks/useWishlist';
import { useRecentlyViewed } from './hooks/useRecentlyViewed';
import './ProductListPage.css';

// ─────────────────────────────────────────────────────────
// 카테고리 / 정렬 옵션 — 컴포넌트 안에 들고 다닌다
// ─────────────────────────────────────────────────────────

const CATEGORIES: { value: 'all' | Product['category']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'electronics', label: '전자제품' },
  { value: 'fashion', label: '패션' },
  { value: 'home', label: '홈' },
  { value: 'beauty', label: '뷰티' }
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'price-asc', label: '가격 낮은순' },
  { value: 'price-desc', label: '가격 높은순' }
];

function isSortBy(value: string): value is SortBy {
  return SORT_OPTIONS.some((opt) => opt.value === value);
}

const VIEW_MODES = ['grid', 'list'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

function isViewMode(value: string): value is ViewMode {
  return VIEW_MODES.some((mode) => mode === value);
}

// ─────────────────────────────────────────────────────────
// 500줄+ 컴포넌트 — UI, 비즈니스 로직, API, 포맷, 도메인 규칙이 한 파일에
// ─────────────────────────────────────────────────────────

export function ProductListPage() {
  // ─── URL 상태 (필터·검색·페이지·정렬 단일 출처) ─────────
  const { category, minPrice, maxPrice, sortBy, searchQuery, page, inStockOnly, setCategory, setMinPrice, setMaxPrice, setSortBy, setSearchQuery, setPage, setInStockOnly, reset: resetFilters } = useProductListParams();

  // ─── 타이핑 입력 표시 전용 draft — URL(SSOT)에는 디바운스 종료 시점에만 반영 ───
  const [searchQueryDraft, setSearchQueryDraft] = useState(searchQuery);
  const [minPriceDraft, setMinPriceDraft] = useState<number | ''>(minPrice);
  const [maxPriceDraft, setMaxPriceDraft] = useState<number | ''>(maxPrice);

  const debouncedSearchQuery = useDebounceValue(searchQueryDraft);
  const debouncedMinPriceDraft = useDebounceValue(minPriceDraft);
  const debouncedMaxPriceDraft = useDebounceValue(maxPriceDraft);

  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchQuery, setSearchQuery]);
  useEffect(() => {
    if (debouncedMinPriceDraft !== minPrice) setMinPrice(debouncedMinPriceDraft);
  }, [debouncedMinPriceDraft, minPrice, setMinPrice]);
  useEffect(() => {
    if (debouncedMaxPriceDraft !== maxPrice) setMaxPrice(debouncedMaxPriceDraft);
  }, [debouncedMaxPriceDraft, maxPrice, setMaxPrice]);

  useEffect(() => setSearchQueryDraft(searchQuery), [searchQuery]);
  useEffect(() => setMinPriceDraft(minPrice), [minPrice]);
  useEffect(() => setMaxPriceDraft(maxPrice), [maxPrice]);

  // ─── 서버 상태 (URL이 유일한 출처) ─────────────────────
  const { products, totalCount, isLoading, error } = useProducts({
    category,
    minPrice,
    maxPrice,
    inStockOnly,
    sortBy,
    searchQuery,
    page
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // ─── 위시리스트 / 최근 본 상품 (localStorage 캡슐화) ────
  const { wishlist, toggleWishlist } = useWishlist();
  const { addRecentlyViewed } = useRecentlyViewed();

  // ─── 페이지가 바뀔 때 스크롤 맨 위로 ────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleCategoryChange = (cat: 'all' | Product['category']) => {
    setCategory(cat);
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setMinPriceDraft(v === '' ? '' : Number(v));
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setMaxPriceDraft(v === '' ? '' : Number(v));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (isSortBy(value)) setSortBy(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQueryDraft(e.target.value);
  };

  const handleInStockToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInStockOnly(e.target.checked);
  };

  // ─── 페이지네이션 계산 (인라인) ─────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ─── 로딩/에러는 early return ───────────────────────────
  if (isLoading && products.length === 0) {
    return <div className="loading">로딩 중...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>오류가 발생했습니다: {error.message}</p>
        <button onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    );
  }

  return (
    <div className="product-list-page">
      <header className="page-header">
        <h1>상품 목록</h1>
        <p className="total-count">
          총 {totalCount.toLocaleString()}개의 상품
          {wishlist.length > 0 && <span> · 위시리스트 {wishlist.length}개</span>}
        </p>
      </header>

      {/* ─── 필터 패널 ──────────────────────────────────── */}
      <section className="filter-panel">
        <div className="filter-group">
          <label>카테고리</label>
          <div className="category-list">
            {CATEGORIES.map((cat) => (
              <button key={cat.value} className={category === cat.value ? 'active' : ''} onClick={() => handleCategoryChange(cat.value)}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>가격 범위</label>
          <div className="price-range">
            <input type="number" placeholder="최소" value={minPriceDraft} onChange={handleMinPriceChange} min={0} />
            <span>~</span>
            <input type="number" placeholder="최대" value={maxPriceDraft} onChange={handleMaxPriceChange} min={0} />
          </div>
        </div>

        <div className="filter-group">
          <label>옵션</label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 400,
              fontSize: 13
            }}
          >
            <input type="checkbox" checked={inStockOnly} onChange={handleInStockToggle} />
            재고 있는 것만
          </label>
        </div>

        <button className="reset-button" onClick={resetFilters}>
          필터 초기화
        </button>
      </section>

      {/* ─── 검색 + 정렬 + 보기 모드 ───────────────────── */}
      <section className="search-sort">
        <input type="search" placeholder="상품 검색..." value={searchQueryDraft} onChange={handleSearchChange} className="search-input" />
        <select value={sortBy} onChange={handleSortChange}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={viewMode}
          onChange={(e) => {
            const { value } = e.target;
            if (isViewMode(value)) setViewMode(value);
          }}
        >
          <option value="grid">그리드</option>
          <option value="list">리스트</option>
        </select>
      </section>

      {/* ─── 상품 그리드 ────────────────────────────────── */}
      <section className="product-grid" style={viewMode === 'list' ? { gridTemplateColumns: '1fr' } : undefined}>
        {products.length === 0 ? (
          <div className="empty">조건에 맞는 상품이 없습니다.</div>
        ) : (
          products.map((product) => <ProductCard key={product.id} product={product} searchQuery={searchQuery} isWished={wishlist.includes(product.id)} onProductClick={addRecentlyViewed} onWishlistToggle={toggleWishlist} />)
        )}
      </section>

      {/* ─── 페이지네이션 ───────────────────────────────── */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* ─── 백그라운드 로딩 인디케이터 ─────────────────── */}
      {isLoading && products.length > 0 && <div className="background-loading">데이터 갱신 중...</div>}
    </div>
  );
}
