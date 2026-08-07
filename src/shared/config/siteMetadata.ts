// AI 생성: week-07 3단계 — 루트 layout과 각 페이지의 generateMetadata가 함께 쓰는 공통 metadata 값.
//
// 페이지의 openGraph는 루트 openGraph와 shallow merge되어 루트 값 전체를 덮는다. 페이지에서 `images`만
// 지정해도 `siteName`·`locale`·`type`이 통째로 사라지므로, 각 페이지는 commonOpenGraph를 펼쳐 쓴 위에
// 자기 필드를 얹는다. 루트(_app)와 페이지(_pages)가 모두 가져다 쓰므로 최하위 shared 레이어에 둔다.
import type { Metadata } from 'next';

export const SITE_NAME = 'Commerce';

export const SITE_DESCRIPTION = 'Loopers 커머스 - 4주차부터 여기에 쌓아갑니다.';

// AI 생성: 전용 OG 이미지를 새로 만들지 않고 1단계에서 만든 Hero 반응형 산출물(214KB)을 재사용한다.
// 원본 hero-original.jpg는 7.2MB라 링크 미리보기 크롤러에 내려보내기에 부적절하다.
export const OG_FALLBACK_IMAGE = '/images/week-07/optimized/hero-responsive-1200w.jpg';

export const commonOpenGraph = {
  siteName: SITE_NAME,
  locale: 'ko_KR',
  type: 'website'
} as const satisfies Metadata['openGraph'];
