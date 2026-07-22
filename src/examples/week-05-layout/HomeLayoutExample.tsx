import Image from 'next/image';
import Link from 'next/link';
import ProductActions from '@/components/commerce/ProductActions/ProductActions';
import './week-05-layout.css';

/**
 * 5주차 과제를 빠르게 시작할 수 있도록 제공하는 최소 레이아웃 예시입니다.
 * 이 구조는 상태관리 아키텍처의 정답이 아닙니다.
 * 그대로 사용하거나, 기존 컴포넌트를 재사용하거나, 자유롭게 교체해도 됩니다.
 * 데이터 조회, Query 구성, 전역 상태와 이벤트 연결은 포함되어 있지 않습니다.
 * 실제 상태를 연결할 때 각 버튼의 aria-pressed를 해당 상품의 포함 여부로 바꿉니다.
 */
export function HomeLayoutExample() {
  return (
    <main className="week05-page">
      <section className="week05-hero">
        <p>배너 설명</p>
        <h1>홈 배너 제목</h1>
      </section>
      <section className="week05-section">
        <h2>카테고리</h2>
        <div className="week05-categories">
          {['캐주얼', '패션', '뷰티·잡화', '홈', '디지털'].map((category) => (
            <Link key={category} href="/products">
              {category}
            </Link>
          ))}
        </div>
      </section>
      {['인기 상품', '신상품'].map((title) => (
        <section className="week05-section" key={title}>
          <h2>{title}</h2>
          <div className="week05-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <article className="week05-product" key={`${title}-${index}`}>
                <Image
                  className="week05-image"
                  src={title === '인기 상품' ? '/images/products/p1.jpg' : '/images/products/p6.jpg'}
                  alt={title === '인기 상품' ? '[11월 20일 예약배송] Winter Rocky Pants 2color 윈터 로키팬츠 OG' : 'WOMAN GNRL 케이블 풀오버 [IVORY] / WBC3L05502'}
                  width={400}
                  height={400}
                />
                <p>브랜드</p>
                <h3>{title === '인기 상품' ? '[11월 20일 예약배송] Winter Rocky Pants 2color 윈터 로키팬츠 OG' : 'WOMAN GNRL 케이블 풀오버 [IVORY] / WBC3L05502'}</h3>
                <strong>0원</strong>
                {/* AI 생성: E번 결정 — 홈 서버 상태 연동 전이라 실제 상품 ID가 없다. 카드 key와 같은 `${title}-${index}`를
                    임시 ID로 써서 담기·찜 핸들러만 먼저 연결한다. 실제 데이터 연동 시 product.id로 교체한다. */}
                <ProductActions productId={`${title}-${index}`} productLabel={`${title} ${index + 1}번 상품`} />
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
