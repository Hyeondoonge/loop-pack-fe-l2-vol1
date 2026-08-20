// AI 생성: week-07 3단계 — 본문과 같은 parser(productListParsers)·같은 query factory(productQueries.list)를
// 써서 같은 URL 정규화·GET URL·options를 만든다. 필터 파싱은 try 밖에 둬 root 상속 대상을 "조회 실패"로만
// 한정한다. getQueryClient()는 호출마다 새 인스턴스라 본문과 Query 캐시를 공유하지 않는다.
// week-08 2단계 — title/description/ogImage 조립(순수 계산)은 buildProductListMetadata로 추출해
// 단위 테스트로 검증한다. 여기 남은 것은 "받아오기 → 조립 → 실패 시 빈 값"뿐이다.
import type { Metadata } from 'next';
import { createLoader } from 'nuqs/server';
import { getQueryClient } from '@/shared/api/getQueryClient';
import { commonOpenGraph } from '@/shared/config/siteMetadata';
import { buildProductListMetadata } from '../lib/buildProductListMetadata';
import { productListParsers } from '../model/productListFilters';
import { productQueries } from './productQueries';

type ProductListPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loadFilters = createLoader(productListParsers);

export async function generateProductListMetadata({ searchParams }: ProductListPageProps): Promise<Metadata> {
  const filters = loadFilters(await searchParams);

  try {
    const productList = await getQueryClient().fetchQuery(productQueries.list(filters));
    const { title, description, ogImage } = buildProductListMetadata(filters, productList);

    return {
      title,
      description,
      openGraph: {
        ...commonOpenGraph,
        title,
        description,
        images: [ogImage]
      }
    };
  } catch {
    return {};
  }
}
