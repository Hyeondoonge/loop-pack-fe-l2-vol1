// AI 생성: 이 parser 맵은 클라이언트 훅(useProductListFilters)과 서버 page.tsx의 createLoader가 함께
// import한다. 'nuqs' 메인 엔트리는 'use client'라 서버에서 부르면 실패하므로, 서버·클라이언트 양쪽에서
// 안전한 'nuqs/server'에서 parser 빌더를 가져온다(동일 parser 객체라 클라이언트 훅 동작은 그대로다).
import { createParser, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { CATEGORY_OPTIONS, FIRST_PAGE, SORT_OPTIONS } from './productListConstants';

// AI 생성: url-state-design.md 6번 항목 — page 하한(0 이하)을 parser 단계에서 첫 페이지로 clamp한다.
// 서버가 무효한 page에 400을 반환하고 그 에러 화면에서는 보정 effect가 실행되지 않으므로, 요청이 나가기 전인 parser 단계에서 막는다.
// URL 표기 자체는 정정하지 않는다(8번 항목, 보류).
const parseAsPageNumber = createParser({
  parse: (value) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return null;
    return Math.max(FIRST_PAGE, parsed);
  },
  serialize: (value) => String(Math.round(value))
});

export const productListParsers = {
  q: parseAsString.withDefault(''),
  category: parseAsStringLiteral(CATEGORY_OPTIONS).withDefault('all'),
  sort: parseAsStringLiteral(SORT_OPTIONS).withDefault('latest'),
  page: parseAsPageNumber.withDefault(FIRST_PAGE)
};
