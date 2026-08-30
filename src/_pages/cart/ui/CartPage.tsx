'use client';

import { useCartStore } from '@/entities/cart';

export default function CartPage() {
  const cartCount = useCartStore((state) => state.ids.size);

  return (
    <main className="page-container">
      <h1>장바구니</h1>
      <p>담은 상품 {cartCount}개</p>
    </main>
  );
}
