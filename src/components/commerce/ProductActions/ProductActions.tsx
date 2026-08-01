// AI 생성: 설계 문서 L(구독 지점을 어디까지 내릴 것인가)은 아직 미결이다.
// "상품 버튼은 포함 여부+action만 구독"(전제 표)을 만족하는 최소 범위로, 카드 전체가 아닌
// 버튼 묶음만 별도 컴포넌트로 뽑았다. F·6번 결정대로 prop은 productId만 받는다.
'use client';

import { useCartStore } from '@/app/store/cart/cartStore';
import { useWishlistStore } from '@/app/store/wishlist/wishlistStore';

interface ProductActionsProps {
  productId: string;
  productLabel: string;
}

export default function ProductActions({ productId, productLabel }: ProductActionsProps) {
  const isInWishlist = useWishlistStore((state) => state.ids.has(productId));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const isInCart = useCartStore((state) => state.ids.has(productId));
  const toggleCart = useCartStore((state) => state.toggle);

  return (
    <div className="product-card-actions">
      <button type="button" aria-label={`${productLabel} 위시리스트`} aria-pressed={isInWishlist} onClick={() => toggleWishlist(productId)}>
        찜
      </button>
      <button type="button" aria-label={`${productLabel} 장바구니`} aria-pressed={isInCart} onClick={() => toggleCart(productId)}>
        담기
      </button>
    </div>
  );
}
