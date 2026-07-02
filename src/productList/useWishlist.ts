import { usePersistentState } from './usePersistentState';
import { STORAGE_KEYS } from './storageKeys';

// 위시리스트 — 렌더에 쓰이므로(includes/length) state 유지. 영속화는 usePersistentState에 위임.
export function useWishlist() {
  const [wishlist, setWishlist] = usePersistentState<number[]>(STORAGE_KEYS.wishlist, []);

  const toggleWishlist = (productId: number) => {
    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  return { wishlist, toggleWishlist };
}
