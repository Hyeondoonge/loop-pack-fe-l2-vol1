// AI 생성: 설계 문서 4번은 "layout.tsx 배치, 개수 구독"만 정했다. 정확한 위치·마크업은
// 홈/목록과 공유하는 레이아웃 클래스(commerce.css)를 그대로 따른다.
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { authQueries } from '@/entities/auth';
import { useCartStore } from '@/entities/cart';
import { useWishlistStore } from '@/entities/wishlist';

export default function Header() {
  const wishlistCount = useWishlistStore((state) => state.ids.size);
  const cartCount = useCartStore((state) => state.ids.size);

  const { data: user } = useQuery(authQueries.me());

  return (
    <div className="site-header">
      <header className="site-header-inner">
        <Link href="/">Commerce</Link>
        <nav aria-label="주요 메뉴">
          <Link href="/products">상품</Link>
          <span>위시리스트 {wishlistCount}</span>
          <span>장바구니 {cartCount}</span>
          {user ? <span>{user.name}님</span> : <Link href="/login">로그인</Link>}
        </nav>
      </header>
    </div>
  );
}
