import { describe, expect, it } from 'vitest';
import { PRODUCT_PAGE_SIZE } from '../model/productListConstants';
import { toProductListQuery } from './toProductListQuery';

describe('toProductListQuery', () => {
  describe('검색어를 서버가 기대하는 형태로 정규화한다', () => {
    it('앞뒤 공백을 지우고 소문자로 바꾼다', () => {
      const query = toProductListQuery({ q: '  NIKE  ', category: 'all', sort: 'latest', page: 1 });

      expect(query.q).toBe('nike');
    });

    it('단어 사이 공백은 그대로 둔다', () => {
      const query = toProductListQuery({ q: '나이키  운동화', category: 'all', sort: 'latest', page: 1 });

      expect(query.q).toBe('나이키  운동화');
    });

    it('대소문자만 다른 두 입력은 같은 검색어가 된다', () => {
      const upperCase = toProductListQuery({ q: 'NIKE', category: 'all', sort: 'latest', page: 1 });
      const lowerCase = toProductListQuery({ q: 'nike', category: 'all', sort: 'latest', page: 1 });

      expect(upperCase.q).toBe(lowerCase.q);
    });

    it('검색어가 비어 있으면 빈 문자열로 둔다', () => {
      const query = toProductListQuery({ q: '', category: 'all', sort: 'latest', page: 1 });

      expect(query.q).toBe('');
    });

    it('공백만 있는 검색어는 비어 있는 것과 같아진다', () => {
      const query = toProductListQuery({ q: '   ', category: 'all', sort: 'latest', page: 1 });

      expect(query.q).toBe('');
    });
  });

  describe('나머지 필터는 그대로 넘기고 페이지 크기를 붙인다', () => {
    it('카테고리·정렬·페이지를 바꾸지 않고 통과시킨다', () => {
      const query = toProductListQuery({ q: '', category: 'casual', sort: 'price-asc', page: 3 });

      expect(query.category).toBe('casual');
      expect(query.sort).toBe('price-asc');
      expect(query.page).toBe(3);
    });

    it('페이지 크기는 호출부가 정하지 않고 공용 상수를 쓴다', () => {
      const query = toProductListQuery({ q: '', category: 'all', sort: 'latest', page: 1 });

      expect(query.pageSize).toBe(PRODUCT_PAGE_SIZE);
    });
  });
});
