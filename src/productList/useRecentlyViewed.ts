import { usePersistentState } from './usePersistentState';
import { STORAGE_KEYS } from './storageKeys';

// 최근 본 상품 — 값은 렌더에서 안 읽힘(write-only). state 값은 미사용이라 _로 두고 갱신만 usePersistentState에 위임.
export function useRecentlyViewed() {
  const [_recentlyViewed, setRecentlyViewed] = usePersistentState<number[]>(STORAGE_KEYS.recentlyViewed, []);

  const addRecentlyViewed = (productId: number) => {
    setRecentlyViewed((prev) => {
      const without = prev.filter((id) => id !== productId);
      return [productId, ...without].slice(0, 10);
    });
  };

  return { addRecentlyViewed };
}
