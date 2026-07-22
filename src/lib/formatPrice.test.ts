import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('로케일을 ko-KR로 고정해 천 단위 구분 기호를 붙인다', () => {
    expect(formatPrice(1234000)).toBe('1,234,000원');
  });

  it('천 단위 미만은 구분 기호 없이 그대로 표시한다', () => {
    expect(formatPrice(0)).toBe('0원');
  });
});
