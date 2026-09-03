'use client';

import { useCartStore } from '@/entities/cart';

interface CartToggleButtonProps {
  productId: string;
  productLabel: string;
}

export default function CartToggleButton({ productId, productLabel }: CartToggleButtonProps) {
  const isInCart = useCartStore((state) => state.items.has(productId));
  const toggleCart = useCartStore((state) => state.toggle);

  return (
    <button type="button" aria-label={`${productLabel} 장바구니`} aria-pressed={isInCart} onClick={() => toggleCart(productId)}>
      담기
    </button>
  );
}
