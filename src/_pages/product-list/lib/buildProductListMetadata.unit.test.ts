import { describe, expect, it } from 'vitest';
import { buildProductListMetadata } from './buildProductListMetadata';
import { OG_FALLBACK_IMAGE } from '@/shared/config/siteMetadata';
import type { Category } from '@/entities/product';

const CATEGORIES: Category[] = [
  { id: 'casual', name: '캐주얼' },
  { id: 'digital', name: '디지털' }
];

// 이 함수가 읽는 상품 필드는 image 하나뿐이라 대표 이미지만 넘긴다.
const SOURCE = { products: [{ image: '/images/first.jpg' }], categories: CATEGORIES, totalCount: 37 };

describe('buildProductListMetadata', () => {
  describe('제목은 검색어와 페이지로 조립한다', () => {
    it('검색어가 있고 두 번째 페이지면 검색 결과 제목에 페이지를 덧붙인다', () => {
      const metadata = buildProductListMetadata({ q: '운동화', category: 'casual', sort: 'price-asc', page: 2 }, SOURCE);

      expect(metadata.title).toBe("'운동화' 검색 결과 (2페이지)");
    });

    it('검색어가 없으면 상품 목록이 제목이 된다', () => {
      const metadata = buildProductListMetadata({ q: '', category: 'all', sort: 'latest', page: 1 }, SOURCE);

      expect(metadata.title).toBe('상품 목록');
    });

    it('첫 페이지에는 페이지 표기를 붙이지 않는다', () => {
      const metadata = buildProductListMetadata({ q: '운동화', category: 'all', sort: 'latest', page: 1 }, SOURCE);

      expect(metadata.title).toBe("'운동화' 검색 결과");
    });

    it('앞뒤 공백만 있는 검색어는 검색어가 없는 것으로 본다', () => {
      const metadata = buildProductListMetadata({ q: '   ', category: 'all', sort: 'latest', page: 1 }, SOURCE);

      expect(metadata.title).toBe('상품 목록');
    });
  });

  describe('설명은 조건과 총 개수를 이어 붙인다', () => {
    it('검색어·카테고리 이름·정렬 라벨·총 개수를 가운뎃점으로 잇는다', () => {
      const metadata = buildProductListMetadata({ q: '운동화', category: 'casual', sort: 'price-asc', page: 2 }, SOURCE);

      expect(metadata.description).toBe("'운동화' · 캐주얼 · 가격 낮은순 · 총 37개");
    });

    it('검색어가 없으면 그 자리를 비우고 나머지만 잇는다', () => {
      const metadata = buildProductListMetadata({ q: '', category: 'all', sort: 'latest', page: 1 }, SOURCE);

      expect(metadata.description).toBe('전체 · 최신순 · 총 37개');
    });

    it('응답 카테고리 목록에 없는 카테고리는 id를 그대로 노출한다', () => {
      const metadata = buildProductListMetadata({ q: '', category: 'home', sort: 'latest', page: 1 }, SOURCE);

      expect(metadata.description).toBe('home · 최신순 · 총 37개');
    });
  });

  describe('대표 이미지는 첫 상품을 쓰고 없으면 폴백한다', () => {
    it('상품이 있으면 첫 상품의 이미지를 쓴다', () => {
      const metadata = buildProductListMetadata({ q: '', category: 'all', sort: 'latest', page: 1 }, SOURCE);

      expect(metadata.ogImage).toBe('/images/first.jpg');
    });

    it('상품이 하나도 없으면 공통 폴백 이미지를 쓴다', () => {
      const metadata = buildProductListMetadata({ q: '없는상품', category: 'all', sort: 'latest', page: 1 }, { products: [], categories: CATEGORIES, totalCount: 0 });

      expect(metadata.ogImage).toBe(OG_FALLBACK_IMAGE);
    });
  });
});
