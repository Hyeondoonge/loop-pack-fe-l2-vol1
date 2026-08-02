'use client';

import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore';

interface WishlistToggleButtonProps {
  productId: string;
  productLabel: string;
}

export default function WishlistToggleButton({ productId, productLabel }: WishlistToggleButtonProps) {
  const isInWishlist = useWishlistStore((state) => state.ids.has(productId));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  return (
    <button type="button" aria-label={`${productLabel} 위시리스트`} aria-pressed={isInWishlist} onClick={() => toggleWishlist(productId)}>
      찜
    </button>
  );
}
