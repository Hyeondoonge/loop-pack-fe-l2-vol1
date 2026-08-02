import ProductCard from '@/entities/product/ui/ProductCard';
import WishlistToggleButton from '@/features/toggle-wishlist/ui/WishlistToggleButton';
import CartToggleButton from '@/features/toggle-cart/ui/CartToggleButton';
import type { Product } from '@/entities/product/model/types';

interface ProductCardWithActionsProps {
  product: Product;
  headingLevel: 'h2' | 'h3';
}

// AI 생성: entities→features 역방향 import를 피하기 위해 카드(entity)와 찜·담기 버튼(각각 독립된 feature)을
// 이 위젯에서 조합한다. entities/product/ui/ProductCard는 toggle 버튼의 존재를 모르고,
// 두 feature도 서로를 모른 채 여기서만 만난다.
export default function ProductCardWithActions({ product, headingLevel }: ProductCardWithActionsProps) {
  return (
    <ProductCard
      product={product}
      headingLevel={headingLevel}
      actions={
        <div className="product-card-actions">
          <WishlistToggleButton productId={product.id} productLabel={product.name} />
          <CartToggleButton productId={product.id} productLabel={product.name} />
        </div>
      }
    />
  );
}
