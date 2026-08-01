// AI 생성: 설계 문서 4번은 "layout.tsx 배치, 개수 구독"만 정했다. 정확한 위치·마크업은
// 홈/목록과 공유하는 레이아웃 클래스(commerce.css)를 그대로 따른다.
'use client';

import Link from 'next/link';
import { useCartStore } from '@/app/store/cart/cartStore';
import { useWishlistStore } from '@/app/store/wishlist/wishlistStore';

export default function Header() {
  const wishlistCount = useWishlistStore((state) => state.ids.size);
  const cartCount = useCartStore((state) => state.ids.size);

  return (
    <div className="site-header">
      <header className="site-header-inner">
        <Link href="/">Commerce</Link>
        <nav aria-label="주요 메뉴">
          <Link href="/products">상품</Link>
          <span>위시리스트 {wishlistCount}</span>
          <span>장바구니 {cartCount}</span>
        </nav>
      </header>
    </div>
  );
}
