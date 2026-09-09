# 5주차 수정 계획 — SSR에서 자기 Route Handler 호출 문제

> 대상: 홈/상품 목록의 서버 렌더링 시 데이터 요청 경로
> 배경: [server-state-design.md](./server-state-design.md) 3번(공통 fetch wrapper)·§8("SSR 렌더링 시 중복 쿼리 요청 방지")대로 구현한 뒤, **구현 후 발견한 문제**에 대한 수정 작업으로 남긴다.
> 표기: 이 문서는 디버깅·설계 논의를 AI로 정리한 초안이며, 결정 내용과 근거는 직접 검토했다.

## 1. 발견한 문제

`http://localhost:3000/products?page=-1` 접속 시 긴 지연이 관찰됐다. 정규화 로직(`parseAsPageNumber`의 page clamp, `parseAsStringLiteral`의 category 기본값)은 정상 동작하며, 실제 서버로는 유효한 값으로만 요청이 나간다. 지연의 원인은 정규화가 아니다.

### 근본 원인

`apiFetch`(`src/app/api/apiFetch.ts`)가 상대경로(`/api/products?...`, `/api/home`)를 그대로 `fetch`에 넘긴다. 브라우저의 `fetch`는 상대경로를 document origin 기준으로 해석하지만, **SSR 시 Node 런타임의 `fetch`는 절대 URL을 요구**한다. 그 결과:

1. Next.js가 클라이언트 컴포넌트(`ProductListSection`, `HomeSection`)를 서버에서 렌더링하며 `useSuspenseQuery`의 `queryFn`을 실행
2. `queryFn` → `getProductList` → `apiFetch(상대경로)` → `Failed to parse URL from ...` 예외
3. Next.js가 서버 렌더링을 포기하고 클라이언트 렌더링으로 전환(콘솔: `Switched to client rendering because the server rendering errored`)
4. 브라우저가 JS 셸을 다시 실행한 뒤에야 실제 요청 발생(+ 목업 500ms 지연) → 체감 지연

이 현상은 `page` 값의 유효/무효와 무관하다. 실측 결과 `?page=1`, `/`(홈)에서도 동일하게 재현된다.

- 실패 지점: `src/app/api/apiFetch.ts:14` (`await fetch(input, init)`)
- 서버 렌더링이 `queryFn`을 트리거하는 지점: `src/productList/ProductListSection.tsx:83`, `src/home/HomeSection.tsx:50`

## 2. 이번 수정의 범위 결정

### 중복 fetch는 감수한다

근본 해결의 완전판은 "서버 조회 성공 + 그 결과를 클라이언트 캐시로 전달(dehydrate/HydrationBoundary)"이지만, 이번 수정에서는 **후자를 하지 않는다.** 서버가 데이터를 받아 HTML을 렌더하더라도, 클라이언트는 빈 캐시로 시작해 한 번 더 요청한다(중복 fetch 1회).

- 근거: 이번 수정의 목표는 "SSR 실패 → CSR 폴백 왕복으로 인한 지연 제거"까지다. server-state-design §8의 "SSR 중복 쿼리 방지"(prefetch + HydrationBoundary)는 별도 작업으로 분리한다.
- 감수하는 비용: 최초 진입 시 서버·클라이언트 각 1회씩, 총 2회 요청.

> **[갱신 2026-07-24]** 이 "감수" 결정은 §6에서 뒤집힌다. 감수한 비용이 요청 2회에 그치지 않고 하이드레이션 역행 깜빡임을 동반함이 확인돼, prefetch + hydration 공통 적용을 채택한다. 이 절은 1차 수정(SSR 상대경로 실패 제거) 시점의 범위 기록으로 남긴다.

## 3. 수정 내용

원칙: **클라이언트는 상대경로 HTTP, 서버는 조회 함수 직접 호출.** 서버가 자기 Route Handler를 HTTP로 되부르지 않는다(Next.js 권장).

### 3-1. 조회 로직을 순수 함수로 추출

`route.ts`의 필터·정렬·페이징 계산을 순수 함수로 분리한다(예: `getProductListData(query): ProductListResponse`). 목업 지연(`waitForMockApi`)은 전송 계층 관심사이므로 함수에 포함하지 않는다.

- `route.ts`(HTTP 경계): 400 검증 → `await waitForMockApi()` → 추출 함수 호출. **검증 책임은 여기 유지**한다.
- 서버 렌더링 경로: 추출 함수를 지연 없이 직접 호출.
- 홈도 동일하게 `getHomeData` 추출.

### 3-2. 적용 순서 — 홈 우선

홈(`HomeSection` / `getHome` / `getHomeData`)에 **먼저 적용**해 수정 방향의 적합성을 확인한 뒤, 동일 패턴을 상품 목록(`ProductListSection` / `getProductList` / `getProductListData`)에 순차 적용한다. 홈이 필터 파라미터가 없어 검증이 단순하고, 문제 구조(SSR 시 상대경로 fetch 실패)는 두 화면이 동일하기 때문.

### 3-3. queryFn 환경 분기

`getProductList`(`getHome`)가 실행 환경에 따라 데이터 출처를 바꾼다.

```ts
export function getProductList(query: ProductListQuery): Promise<ProductListResponse> {
  if (typeof window === 'undefined') {
    return getProductListData(query); // 서버: 직접 호출, HTTP 없음
  }
  return apiFetch(`/api/products?${toSearchParams(query)}`); // 클라이언트: 상대경로
}
```

- nuqs 파서는 별도로 다시 적용하지 않는다. SSR 시 `ProductListSection`의 `useProductListFilters`(`useQueryStates`) 훅이 서버에서도 실행되어 `NuqsAdapter`를 통해 같은 파서(page clamp, category 기본값)를 이미 태운다. 따라서 `queryFn`이 받는 `query`는 이미 정규화돼 있고, 서버 분기는 그 `query`를 그대로 조회 함수에 넘기기만 한다.

## 4. query parameter 초기값 — 설계대로 동일 적용

서버 렌더링 경로도 URL 상태 설계([url-state-design.md](./url-state-design.md))에서 정한 query parameter 초기값·정규화 규칙을 클라이언트와 **동일하게** 적용한다.

- SSR 시 `useQueryStates`가 서버에서도 같은 `productListParsers`(`q`/`category`/`sort` 기본값, `page` clamp)를 태우므로, 별도 서버 파싱 로직 없이 동일 초기값이 보장된다. 서버 분기(`getProductListData`)는 이렇게 정규화된 `query`를 그대로 받는다.
- 초기값이 서버·클라이언트에서 어긋나면 안 되는 이유: 같은 URL이 두 환경에서 같은 조회 조건으로 해석되어야 서버 렌더 HTML과 클라이언트 재요청 결과가 일치한다(중복 fetch를 감수하더라도 내용이 달라지면 안 됨).
- 검증은 §7로 이관: `?page=2` 등 기본값이 아닌 URL에서 서버 렌더 HTML에 해당 페이지 데이터가 담기는지 확인한다.

## 5. 알려진 트레이드오프

`typeof window` 분기로 조회 함수를 `queryFn`이 있는 공유 모듈에 끌어오면, 번들러가 죽은 분기를 확실히 제거하지 못해 `_data/commerce.ts`(목업 30개 + 지연 코드)가 클라이언트 번들에 포함될 수 있다.

- 이 학습용 레포에서는 데이터 크기가 작고 민감정보가 없어 감수한다.
- 서버 데이터를 클라이언트 번들에서 완전히 배제하려면 조회를 Server Component(`page.tsx`)로 옮기고 prefetch로 소유권을 이전해야 하는데, 이는 아래 후속 작업(prefetch + HydrationBoundary)과 함께 다룬다.

> **[갱신 2026-07-24]** 이 트레이드오프는 **아직 닫히지 않았다.** prefetch + hydration을 적용한 뒤에도 유출은 그대로다 — 프로덕션 빌드 실측에서 클라이언트 청크(35KB)에 상품 30개 전체가 사이즈별 재고·평점·리뷰수까지 포함돼 있음을 확인했다. 이유와 해소 조건은 §6-4에 기록한다.

## 6. prefetch + hydration 공통 적용 (결정)

> **결정**: home·productlist 두 서버 상태에 prefetch + `dehydrate`/`HydrationBoundary`를 공통 적용한다. `page.tsx`(Server Component)에서 클라이언트와 **동일한 `queryOptions`를 통째로** `prefetchQuery`에 넘겨(과제 Advanced B의 "동일 쿼리 팩토리 재사용" 요건) → `dehydrate` → `HydrationBoundary`로 내려보내고, 클라이언트 query key와 정확히 일치시킨다. §2에서 감수했던 중복 fetch를 여기서 제거하며, server-state-design §8의 "SSR 중복 쿼리 방지" 목표를 이 작업에서 달성한다.
>
> 이 "통째로 재사용" 선택이 §6-4의 결과를 좌우한다 — `queryOptions` 안의 `queryFn`이 곧 `getHome`/`getProductList`이므로, 서버 prefetch도 그 함수를 타게 된다.

### 의사결정 근거

**왜 지금 도입하나** — §2의 "감수" 결정을 뒤집는 근거

- 감수한 비용이 "요청 2회"에 그치지 않는다. 클라 캐시가 비어 하이드레이션 직후 `useSuspenseQuery`가 재suspend → SSR로 이미 그린 완성 화면이 `<Suspense fallback>`으로 되돌아갔다가 재조회 후 복귀하는 **역행 깜빡임**이 동반된다(초기 로딩 깜빡임이 아니라, 그린 화면을 도로 지우는 문제).
- → 이번 도입은 성능 튜닝이 아니라 **결함(역행 깜빡임 + 중복 요청) 수정**이다.

> **[정정 2026-07-24]** 최초 작성 시 여기에 "`typeof window` 분기(§5)의 번들 유출도 prefetch로 함께 해소된다"고 적었으나 **틀렸다.** prefetch + hydration은 번들 유출을 해결하지 않는다(§6-4에 실측 근거). 이 도입의 성과는 역행 깜빡임·중복 요청 제거까지이며, 번들 유출은 별개 미해결 항목으로 남는다.

**왜 두 화면 공통인가**

- 실패 구조가 동일하다: 두 화면 모두 SSR HTML엔 데이터가 있으나 클라 캐시로 전달하는 경로가 없어 재suspend한다. §6-1 표가 두 화면에 그대로 적용된다.

**두 화면의 차이 = 적용 조건 분기**

- home: `queryKey: ['home','detail']` 상수 → 키 불일치가 구조적으로 불가능 → 리스크 0, 먼저 적용한다.
- productlist: 키가 `filters` 파생 → 서버·클라 파서 단일 출처가 **선행 조건**이다(§6-2). 어긋나면 캐시 miss로 오히려 느려진다.

### 6-1. 왜 prefetch와 hydration을 반드시 **함께** 써야 하나

둘은 서로 다른 절반이라 하나만으론 "서버가 받아서 클라가 재사용" 목적이 성립하지 않는다.

| 메커니즘 | 하는 일 | 혼자 쓰면 |
| --- | --- | --- |
| `prefetchQuery` | Server Component가 데이터를 받아 **자기 QueryClient 캐시에 담음** | 담아만 두고 클라로 안 넘어감 → 클라는 빈 캐시로 시작 → 재요청 |
| `dehydrate` + `HydrationBoundary` | 그 서버 캐시를 직렬화해 **클라 캐시로 전달** | 넘길 원본(prefetch된 캐시)이 없으면 전달할 게 없음 |

- **prefetch만**: 서버 캐시와 클라 캐시는 별개 인스턴스다. HTML만 클라로 가고 캐시는 안 간다. 클라의 `useSuspenseQuery`는 데이터를 못 찾아 suspend → 다시 fetch → prefetch가 헛수고. (지금 우리 상태 = 둘 다 없어서 클라가 재요청하는 것과 동일한 결말)
- **hydration만**: `HydrationBoundary`는 넘길 캐시가 있어야 넘긴다. prefetch로 미리 채워두지 않으면 dehydrate 결과가 비어 아무것도 전달되지 않는다.
- 한 줄: `prefetch = 서버가 받는다` / `hydration = 클라가 이어받는다`. 목적이 "서버가 받아서 클라가 재사용"이므로 **둘 다** 있어야 중복 fetch가 사라진다.

### 6-2. hydration 도입 시 지켜야 할 불변식 — 같은 파서 = 같은 쿼리 키

hydration은 **쿼리 키 단위로** 서버 캐시를 클라 캐시에 복사한다. prefetch를 얹으면 파싱 지점이 둘(Server Component, Client의 `useQueryStates`)이 되는데, 둘의 정규화가 어긋나면 키가 갈라진다.

- 예: `?page=-1`에서 서버 파서는 clamp해 `page:1`, 클라 파서는 `page:-1` → 키 불일치 → 클라가 하이드레이션된 캐시를 못 찾음 → 재요청(prefetch 헛수고). `q` 대소문자·trim, `category` 기본값도 동일하게 어긋날 수 있음.
- 해법: 서버 쪽에 파서를 **손으로 재구현하지 말고** 같은 `productListParsers` 정의를 재사용한다.
- **구현 결과**: `nuqs/server`의 `createLoader(productListParsers)`를 사용했다(당초 이 문서엔 `createSearchParamsCache`로 적었으나, `searchParams` prop을 직접 받는 이 구조에는 `createLoader`가 맞아 변경). 이때 `productListFilters.ts`의 parser import를 `nuqs` → `nuqs/server`로 바꿔야 했다 — `nuqs` 메인 엔트리에는 `'use client'` 지시어가 있어 Server Component에서 호출하면 빌드가 실패한다. `nuqs/server`는 같은 parser 빌더를 지시어 없이 재노출하므로 클라이언트 훅도 동일 객체를 그대로 쓴다(단일 출처 유지).
- 이 불변식은 **hydration을 도입한 지금부터 load-bearing이다.** (1차 수정 시점에는 파싱 지점이 `useQueryStates` 하나뿐이고 캐시 전달도 없어 무의미한 규칙이었다.)

### 6-3. 적용 범위 — 초기 진입만, 페이지네이션은 후속

- **이번 구현 포함**: URL 직접 진입 시점의 초기 조회 1건. home은 `homeQueries.detail()`, productlist는 URL이 가리키는 그 한 필터 조합(`productQueries.list(filters)`)만 서버에서 prefetch → dehydrate한다.
- **후속 작업으로 분리**: 페이지네이션(다음/이전 페이지) prefetch. `useSuspenseQuery`는 `placeholderData: keepPreviousData`를 타입 레벨에서 못 쓰므로(설치본 타입 정의에서 `placeholderData`가 `Omit`됨), 페이지 전환 시 `Suspense` 경계 전체가 재suspend해 검색창·정렬 select 등 필터 UI가 통째로 언마운트되는 문제는 **초기 진입 prefetch로 풀리지 않는다.** 이는 hover/focus prefetch + nuqs 세터 `startTransition`이라는 별개 조치가 필요하고, 목업이 최대 3페이지라 효과 범위도 작다. 초기 진입 안정화 후 실서버에서 재측정해 착수한다.

### 6-4. typeof window 분기 — 제거하지 못했다 (당초 계획 철회)

**당초 계획(철회)**: "prefetch 도입 후엔 `page.tsx`가 캐시를 채우므로 클라이언트 컴포넌트의 `useSuspenseQuery`가 서버 렌더 중 `queryFn`을 호출하지 않는다 → 분기는 죽은 코드가 된다 → 제거하고 `server-only`로 재발을 막는다."

**이 전제는 틀렸다.** 앞의 두 문장 중 첫 문장은 맞지만(캐시가 차 있으면 `useSuspenseQuery`는 `queryFn`에 도달하지 않는다), 결론이 성립하지 않는다. §6의 결정대로 `queryOptions`를 **통째로** 재사용하기 때문이다:

```
page.tsx: prefetchQuery(homeQueries.detail())
            └ homeQueries.detail().queryFn === getHome
               └ getHome()이 서버에서 실행됨  ← 분기가 여기서 필요하다
```

즉 `HomeSection`이 `queryFn`을 안 부르게 된 대신, **`prefetchQuery`가 그 자리를 대신 호출한다.** 서버에서 `getHome`이 실행되는 경로는 사라지지 않고 옮겨갔을 뿐이다.

**실측 검증** (분기 2개를 제거하고 프로덕션 빌드 후 기동):

```
⨯ TypeError: Failed to parse URL from /api/home
  [cause]: TypeError: Invalid URL
→ SSR HTML에 홈 데이터 0건 (§1의 원래 버그가 prefetch 안에서 재발)
```

따라서 `typeof window` 분기는 죽은 코드가 아니라 **현재 구조에서 실제로 실행되는 필수 코드**다. 제거 계획을 철회하고 §3-3 그대로 유지한다.

**번들 유출 현황 (미해결)**

프로덕션 빌드 산출물 실측 — `.next/static/chunks` 내 35KB 청크에 다음이 포함:

```
{id:"p1", name:"[11월 20일 예약배송] Winter Rocky Pants ...", price:79e3,
 freeShipping:!0, sizes:[{value:24,stock:3},{value:25,stock:0},...],
 rating:4.8, reviewCount:312, createdAt:"..."}          ← p1~p30 전체
```

같은 빌드에서 분기만 제거하면 이 문자열이 **완전히 사라짐**도 확인했다. 즉 유출의 직접 원인은 분기가 강제하는 정적 import 체인(`homeQueries` → `getHome` → `getHomeData` → `_data/commerce`)이고, 번들러는 `typeof window`를 런타임 조건으로 보므로 이 import를 제거하지 못한다.

**해소 조건** — 유출을 없애려면 `queryFn`만 서버용으로 갈아끼워야 한다(`queryKey`는 하이드레이션 불변식이므로 반드시 공유 유지):

```ts
const homeQuery = homeQueries.detail();
queryClient.prefetchQuery({ ...homeQuery, queryFn: () => getHomeData() });
```

이렇게 하면 `getHome`이 서버에서 호출되는 마지막 경로가 사라져 분기를 지울 수 있고, 정적 import 체인이 끊겨 유출도 함께 사라진다. 다만 이는 Advanced B 요건의 "동일 `queryOptions` 쿼리 팩토리 재사용"을 `queryKey`·정책만 재사용하는 형태로 바꾸는 것이므로, **이번 범위에서는 적용하지 않고 과제 요건을 문자 그대로 만족하는 현재 형태를 유지한다.**

**`server-only`에 대하여**: 미설치 패키지이며(새 의존성 추가는 CLAUDE.md상 사전 제안 필요), 위 실측이 보여주듯 **유출 해결에 필요하지 않다.** 분기 제거만으로 유출은 사라진다. `server-only`는 그 이후 누군가 서버 전용 모듈을 클라이언트에서 다시 import하는 회귀를 빌드 단계에서 막는 **가드**일 뿐이다. 이번엔 도입하지 않는다.

## 7. 검증

### 홈 (적용 완료)

- [x] `/` 접속 시 콘솔에 `Switched to client rendering...` 에러가 사라진다. (Playwright 실측 확인)
- [x] 서버 렌더 HTML에 홈 데이터가 담긴다. (`curl`로 배너 문구·상품명이 최초 응답 HTML에 포함됨을 확인 — JS 없이도 콘텐츠 존재)
- [x] `pnpm lint` 통과 (기존 경고 15개 외 신규 없음), `pnpm build` 통과.
- [x] `getHomeData` 조회 결과 테스트 2개 추가(`getHomeData.test.ts`) — 기존 `route.test.ts`와 동일 픽스처 기대값.
- [x] 방향 적합성 확인 완료 → 상품 목록에 동일 패턴 적용 승인 대기/진행.

### 상품 목록 (적용 완료)

`force-dynamic` 적용으로 진행(정적/동적 결정: nuqs 클라이언트 훅이 동적 렌더링을 유발하지 않아 기본 Static → URL 필터를 서버 렌더에 반영하려면 동적 강제 필요).

- [x] `?page=-1` 접속 시 콘솔에 `Switched to client rendering...` 에러가 사라지고, page가 1로 clamp되어 정상 렌더(페이지네이션 "1 / 3"). (Playwright 실측)
- [x] 서버 렌더 HTML에 상품 데이터가 담긴다 — `curl`로 상품 12개(`week05-product`)가 최초 응답 HTML에 포함됨 확인(JS 없이).
- [x] query parameter 초기값 동일 적용 확인: `curl "?page=2&sort=price-asc"`가 1페이지와 **다른** 2페이지 상품을 서버 HTML에 담음. `/products`가 빌드 출력에서 `ƒ (Dynamic)`으로 전환됨 확인.
- [x] `pnpm lint`(신규 error 0, 경고는 route.ts에서 이동한 `q`/`a`/`b` id-length 동일 패턴), `pnpm build` 통과.
- [x] `getProductListData.test.ts` 4개 추가(페이징·totalCount·정렬·카테고리·empty). 기존 `toProductListQuery.test.ts`·`route.test.ts` 유지.

### prefetch + hydration (적용 완료)

프로덕션 빌드(`pnpm build` → `pnpm start`) 기준, 헤드리스 Chromium 실측.

- [x] `/`·`/products` 초기 진입 시 화면이 `<Suspense fallback>`으로 되돌아가지 않는다 — 폴백 문구 DOM 출현 **0건**. 페이지 스크립트보다 먼저 `MutationObserver`를 설치해 샘플링 공백 없이 관찰.
- [x] 서버·클라 각 1회(총 2회) → **초기 조회 1회**로 감소 — 초기 로드 중 클라이언트 `/api/home`·`/api/products` 요청 **0건**.
- [x] productlist: `?page=2&sort=price-asc`에서 서버 prefetch 키와 클라 `useQueryStates` 키 일치(캐시 hit) — 재요청 0건으로 확인. (§6-2 불변식)
- [x] 하이드레이션 에러·불일치 경고 0건 (`pageerror` + `console.error` 캡처).
- [x] 캐시 전달 직접 증거: SSR HTML에 `{"dehydratedAt":...,"state":{"data":{"banner":...` 페이로드가 실려 내려감을 `curl`로 확인. 폴백 문구는 RSC 페이로드의 `fallback` prop **정의**로만 존재하고 렌더된 DOM에는 없음.
- [x] `pnpm check`(test 63개·lint·typecheck·build) 전체 통과.

> **위음성 배제**: "0건" 결과가 탐지기 고장 때문이 아님을 두 양성대조로 확인했다. ① 폴백 문구를 DOM에 직접 주입 → 즉시 탐지됨. ② 정렬 select 변경 → `/api/products?...sort=price-desc` 요청 1건 정상 포착. (초기 검증 시도에서 `MutationObserver` 설치가 조용히 실패해 "0건"이 무효였던 적이 있어 이 대조를 추가했다.)

**미해결 (§6-4)**

- [ ] 클라이언트 번들에서 `_data/commerce` seed 문자열 제거 — **현재 유출 상태.** 35KB 청크에 상품 30개 전체가 내부 필드까지 포함돼 있음을 실측 확인. 해소하려면 `queryFn` 분리가 필요하며, 이번 범위에서 적용하지 않기로 결정했다.

> 참고: `route.test.ts`와 무관한 기존 실패 1건(`commerce.test.ts` 이미지 매니페스트 검사)은 이번 변경 전에도 실패하던 것으로, `git stash`로 확인해 이번 작업과 무관함.
