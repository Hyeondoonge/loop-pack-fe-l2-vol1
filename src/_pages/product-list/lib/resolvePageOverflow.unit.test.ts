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

  describe('결과가 비어 있으면 정상 상태로 보고 보정하지 않는다', () => {
    it('검색 결과가 없을 때 첫 페이지는 그대로 둔다', () => {
      expect(resolvePageOverflow(1, 0, 12)).toBeNull();
    });

    it('검색 결과가 없으면 페이지가 범위를 벗어나 보여도 보정하지 않는다', () => {
      expect(resolvePageOverflow(5, 0, 12)).toBeNull();
    });
  });
});
