import type { Product } from './types';
import { formatPrice, getProductBadges, isFreeShipping } from './productRules';

interface ProductCardProps {
  product: Product;
  searchQuery: string;
  isWished: boolean;
  onProductClick: (productId: number) => void;
  onWishlistToggle: (productId: number) => void;
}

export default function ProductCard({ product, searchQuery, isWished, onProductClick, onWishlistToggle }: ProductCardProps) {
  const badges = getProductBadges(product);
  const formattedOriginal = product.originalPrice ? formatPrice(product.originalPrice) : null;

  const handleCardClick = () => onProductClick(product.id);
  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWishlistToggle(product.id);
  };

  return (
    <article className="product-card" onClick={handleCardClick}>
      <div className="image-wrap">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        {badges.map((badge) => (
          <span key={badge.key} className={`badge ${badge.className}`}>
            {badge.label}
          </span>
        ))}
      </div>

      <div className="card-body">
        <h3 className="product-name">{highlightMatch(product.name, searchQuery)}</h3>
        <div className="price-area">
          {formattedOriginal && <span className="original-price">{formattedOriginal}</span>}
          <span className="price">{formatPrice(product.price)}</span>
          {isFreeShipping(product) && <span style={{ marginLeft: 6, fontSize: 11, color: '#2e7d32', fontWeight: 600 }}>무료배송</span>}
        </div>
        <div className="rating-area">
          <span className="rating">★ {product.rating.toFixed(1)}</span>
          <span className="review-count">({product.reviewCount.toLocaleString()})</span>
          <button style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 }} onClick={handleWishlistClick} aria-label="위시리스트 토글">
            {isWished ? '♥' : '♡'}
          </button>
        </div>
      </div>
    </article>
  );
}

// 검색어 하이라이팅 — JSX 반환 위해 .tsx 모듈 내 정의
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      // ponytail: index를 key로 사용 — split() 결과는 매 렌더 재계산되는 파생 배열이라 재정렬/삽입 없음, 각 조각도 무상태 leaf
      <mark key={i} style={{ background: '#fff176', padding: 0 }}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}
