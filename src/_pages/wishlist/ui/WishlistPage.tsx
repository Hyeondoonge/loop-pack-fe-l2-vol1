'use client';

import { useWishlistStore } from '@/entities/wishlist';

export default function WishlistPage() {
  const wishlistCount = useWishlistStore((state) => state.ids.size);

  return (
    <main className="page-container">
      <h1>위시리스트</h1>
      <p>찜한 상품 {wishlistCount}개</p>
    </main>
  );
}
