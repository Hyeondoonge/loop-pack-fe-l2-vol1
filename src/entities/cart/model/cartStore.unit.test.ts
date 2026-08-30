import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from '@/entities/cart';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ ids: new Set(['p0']) });
  });

  it('담으면 개수가 늘고, 다시 누르면 준다', () => {
    useCartStore.getState().toggle('p1');
    expect(useCartStore.getState().ids.size).toBe(2);

    useCartStore.getState().toggle('p1');
    expect(useCartStore.getState().ids.size).toBe(1);
  });
});
