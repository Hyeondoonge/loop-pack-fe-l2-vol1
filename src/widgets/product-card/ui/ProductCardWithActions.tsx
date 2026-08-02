import ProductCard from '@/entities/product/ui/ProductCard';
import ProductActions from './ProductActions';
import type { Product } from '@/entities/product/model/types';

interface ProductCardWithActionsProps {
  product: Product;
  headingLevel: 'h2' | 'h3';
}

// AI 생성: entities→features 역방향 import를 피하기 위해 카드(entity)와 찜·담기 버튼(features 후보)을
// 이 위젯에서 조합한다. entities/product/ui/ProductCard는 toggle 버튼의 존재를 모른다.
export default function ProductCardWithActions({ product, headingLevel }: ProductCardWithActionsProps) {
  return <ProductCard product={product} headingLevel={headingLevel} actions={<ProductActions productId={product.id} productLabel={product.name} />} />;
}
