// AI 생성: 설계 문서 4번은 "layout.tsx 배치, 개수 구독"만 정했다. 정확한 위치·마크업은
// 기존 홈/목록 예시(HomeLayoutExample.tsx)의 헤더 구조를 그대로 옮겨 만들었다.
'use client';

import Link from 'next/link';
import { useCartStore } from '@/app/store/cart/cartStore';
import { useWishlistStore } from '@/app/store/wishlist/wishlistStore';
import '@/examples/week-05-layout/week-05-layout.css';

export default function Header() {
  const wishlistCount = useWishlistStore((state) => state.ids.size);
  const cartCount = useCartStore((state) => state.ids.size);

  return (
    <div className="week05-header-bar">
      <header className="week05-header">
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
