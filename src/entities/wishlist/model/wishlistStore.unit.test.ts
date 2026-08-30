import { beforeEach, describe, expect, it } from 'vitest';
import { useWishlistStore } from '@/entities/wishlist';

describe('useWishlistStore', () => {
  beforeEach(() => {
    useWishlistStore.setState({ ids: new Set(['p0']) });
  });

  it('담으면 개수가 늘고, 다시 누르면 준다', () => {
    useWishlistStore.getState().toggle('p1');
    expect(useWishlistStore.getState().ids.size).toBe(2);

    useWishlistStore.getState().toggle('p1');
    expect(useWishlistStore.getState().ids.size).toBe(1);
  });
});
