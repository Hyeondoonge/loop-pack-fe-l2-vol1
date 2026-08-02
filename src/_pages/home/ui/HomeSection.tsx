// AI 생성: 데이터 연동은 ProductListSection.tsx와 같은 방식으로 페이지 섹션 컴포넌트에 구현한다
// (페이지/컴포넌트/API 분리 원칙). 레이아웃 클래스는 commerce.css를 공유한다.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';
import { homeQueries } from '@/_pages/home/api/homeQueries';
import { formatPrice } from '@/lib/formatPrice';
import ProductActions from '@/components/commerce/ProductActions/ProductActions';
import type { Product } from '@/types/commerce';

interface ProductGridSectionProps {
  title: string;
  products: Product[];
}

function ProductGridSection({ title, products }: ProductGridSectionProps) {
  if (products.length === 0) {
    // AI 생성: 빈 결과 안내 문구. ProductListSection의 빈 결과 처리와 같은 패턴.
    return (
      <section className="content-section">
        <h2>{title}</h2>
        <p>표시할 상품이 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="content-section">
      <h2>{title}</h2>
      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <Image className="product-card-image" src={product.image} alt={product.name} width={400} height={400} />
            <p>{product.brand}</p>
            <h3>{product.name}</h3>
            <strong>{formatPrice(product.price)}</strong>
            <ProductActions productId={product.id} productLabel={product.name} />
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomeSection() {
  const { data: home } = useSuspenseQuery(homeQueries.detail());

  return (
    <main className="page-container">
      <section className="home-hero">
        <p>{home.banner.description}</p>
        <h1>{home.banner.title}</h1>
      </section>
      <section className="content-section">
        <h2>카테고리</h2>
        <div className="category-links">
          {home.categories.map((category) => (
            <Link key={category.id} href={`/products?category=${category.id}`}>
              {category.name}
            </Link>
          ))}
        </div>
      </section>
      <ProductGridSection title="인기 상품" products={home.popularProducts} />
      <ProductGridSection title="신상품" products={home.newProducts} />
    </main>
  );
}
