import type { Product } from './types';

export function formatPrice(value: number): string {
  return value.toLocaleString() + '원';
}

export function getDiscountRate(product: Product): number {
  return product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
}

export function getDaysSinceCreated(product: Product): number {
  const created = new Date(product.createdAt).getTime();
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
}

export function isFreeShipping(product: Product): boolean {
  return product.price >= 50000;
}

export type ProductBadge = { key: string; label: string; className: string };

// 배지 노출 규칙·렌더 순서를 한곳에 모음 (원본 조건·순서 보존)
export function getProductBadges(product: Product): ProductBadge[] {
  const badges: ProductBadge[] = [];
  const discountRate = getDiscountRate(product);
  const isSoldOut = product.stock === 0;
  const isAlmostSoldOut = product.stock > 0 && product.stock <= 5;

  if (discountRate > 0) badges.push({ key: 'discount', label: `${discountRate}% 할인`, className: 'badge-discount' });
  if (getDaysSinceCreated(product) <= 7) badges.push({ key: 'new', label: 'NEW', className: 'badge-new' });
  if (discountRate >= 30) badges.push({ key: 'hot', label: '특가', className: 'badge-hot' });
  if (product.rating >= 4.5 && product.reviewCount >= 100) badges.push({ key: 'best', label: 'BEST', className: 'badge-best' });
  if (isSoldOut) badges.push({ key: 'soldout', label: '품절', className: 'badge-soldout' });
  else if (isAlmostSoldOut) badges.push({ key: 'warning', label: '품절 임박', className: 'badge-warning' });

  return badges;
}
