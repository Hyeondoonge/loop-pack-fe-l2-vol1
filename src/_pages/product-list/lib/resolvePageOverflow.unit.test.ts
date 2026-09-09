import { describe, expect, it } from 'vitest';
import { resolvePageOverflow } from './resolvePageOverflow';

describe('resolvePageOverflow', () => {
  describe('페이지가 유효 범위 안에 있으면 보정하지 않는다', () => {
    it('첫 페이지는 보정 대상이 아니다', () => {
      expect(resolvePageOverflow(1, 30, 12)).toBeNull();
    });

    it('마지막 페이지와 정확히 같으면 아직 범위 안이므로 보정하지 않는다', () => {
      expect(resolvePageOverflow(3, 30, 12)).toBeNull();
    });
  });

  describe('페이지가 마지막 페이지를 넘어가면 마지막 페이지로 보정한다', () => {
    it('마지막 페이지를 한 칸 넘어가면 마지막 페이지를 돌려준다', () => {
      expect(resolvePageOverflow(4, 30, 12)).toBe(3);
    });

    it('마지막 페이지를 크게 넘어가도 마지막 페이지로 한 번에 보정한다', () => {
      expect(resolvePageOverflow(999, 30, 12)).toBe(3);
    });
  });

  describe('마지막 조각도 한 페이지로 세어 전체 페이지 수를 낸다', () => {
    it('마지막 페이지가 페이지 크기의 절반도 못 채워도 그 페이지는 범위 안이다', () => {
      // 25개는 12 + 12 + 1이라 3페이지다. 나머지 1을 버리면 2페이지가 되어 마지막 상품에 닿지 못한다.
      expect(resolvePageOverflow(3, 25, 12)).toBeNull();
      expect(resolvePageOverflow(4, 25, 12)).toBe(3);
    });

    it('결과가 한 페이지를 못 채워도 한 페이지는 있다', () => {
      expect(resolvePageOverflow(1, 5, 12)).toBeNull();
      expect(resolvePageOverflow(2, 5, 12)).toBe(1);
    });

    it('페이지 크기로 나누어떨어지면 빈 페이지를 더 만들지 않는다', () => {
      expect(resolvePageOverflow(2, 24, 12)).toBeNull();
      expect(resolvePageOverflow(3, 24, 12)).toBe(2);
    });
  });

  describe('결과가 비어 있으면 정상 상태로 보고 보정하지 않는다', () => {
    it('검색 결과가 없을 때 첫 페이지는 그대로 둔다', () => {
      expect(resolvePageOverflow(1, 0, 12)).toBeNull();
    });

    it('검색 결과가 없으면 페이지가 범위를 벗어나 보여도 보정하지 않는다', () => {
      expect(resolvePageOverflow(5, 0, 12)).toBeNull();
    });
  });
});
