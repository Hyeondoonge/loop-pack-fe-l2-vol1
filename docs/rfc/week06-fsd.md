# RFC: week-06 FSD 전환

- Tag: FE_L2 / Round.6 / RFC
- Status: Draft
- 문서 설명

## 0단계 — 동작 기준선

### 홈 (`/`)

| 상태                       | 확인 방법                                       | 기준 결과                                                                                                     | 비고                                                      |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 정상                       | 브라우저: `/` 접속                              | 배너 제목("매일 새롭게 발견하는 취향") · 카테고리 링크 5개 · "인기 상품" 6개 · "신상품" 6개 카드 렌더         | —                                                         |
| 로딩                       | 임시: `getHomeData()` throw로 SSR 프리페치 실패 | Suspense fallback "홈 정보를 불러오는 중입니다..." 표시, **8~10초 유지**                                      | 정상 플로우에서는 프리페치가 성공해 표시되지 않음         |
| 에러 — 조회 실패(5xx)      | 임시: 위와 동일(`/api/home`이 500 반환)         | 로딩 8~10초 후 "홈 정보를 불러오지 못했습니다. / 잠시 후 다시 시도해 주세요." **재시도 버튼 없음**, 헤더 유지 | `retry` 3회 + 백오프 때문에 실패 인지가 늦다              |
| 에러 — 잘못된 요청(4xx)    | 임시: `home/route.ts`에서 400 즉시 반환         | **1초 내** 에러 화면. 문구·레이아웃이 5xx와 완전히 동일                                                       | 4xx는 재시도하지 않음 — 화면은 같고 도달 시간만 10배 차이 |
| 에러 — 예상 밖 렌더링 오류 | 임시: `HomeSection` 렌더 중 throw               | `page.tsx`의 `ErrorBoundary`가 잡아 위와 같은 화면, 헤더 유지                                                 | 5xx·4xx·렌더링 오류 세 유형이 모두 같은 화면으로 수렴     |
| 빈 상태                    | 임시: `getHomeData`에 `scenario='empty'` 강제   | 배너·카테고리 링크 5개는 유지, 두 상품 섹션만 "표시할 상품이 없습니다."(카드 0개)                             | —                                                         |

### 상품 목록 (`/products`)

#### 상태

| 상태                           | 확인 방법                                                                        | 기준 결과                                                                                                                        | 비고                                                           |
| ------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 정상                           | 브라우저: `/products` 접속                                                       | "총 30개", 카드 12개, "1 / 3", "이전" 비활성화                                                                                   | —                                                              |
| 로딩 — 첫 진입                 | 임시: `getProductList` 서버 분기만 throw(클라이언트 경로는 정상)                 | "상품 목록을 불러오는 중입니다..."가 300ms까지 표시 → 500ms에 데이터 도착. 필터 UI는 로딩 중에도 렌더                            | 정상 플로우에서는 프리페치·RSC로 데이터가 채워져 표시되지 않음 |
| 로딩 — 필터 전환 중            | 브라우저: 카테고리를 "패션"으로 변경 후 150ms 시점 관찰(mock 지연 500ms)         | 이전 목록 유지 — 첫 카드 "Margaret Sweatshirt - Oatmeal", "총 30개", `aria-busy="true"`. 응답 후 "총 6개", `aria-busy="false"`   | `keepPreviousData`                                             |
| 에러 — 조회 실패(5xx·네트워크) | 브라우저: `/api/products` 응답 500 강제, 캐시 없는 새 카테고리(`casual`)로 전환  | "상품 목록을 불러오지 못했습니다." + "다시 시도" 버튼. 카테고리 select는 비활성화되나 검색 입력창은 조작 가능                    | —                                                              |
| 에러 — 잘못된 검색 조건(4xx)   | 브라우저: `/api/products` 응답 400 강제, 캐시 없는 새 카테고리(`digital`)로 전환 | "요청 조건을 확인해주세요." + "필터 초기화" 버튼(재시도 버튼 없음)                                                               | O 섹션 에러 처리 표와 일치                                     |
| 에러 — 재시도 복구             | 브라우저: 500 실패 화면에서 인터셉트 해제 후 "다시 시도" 클릭                    | 전체 새로고침 없이 정상 데이터로 복구                                                                                            | —                                                              |
| 에러 — 배경 재요청 실패        | 브라우저: 정상 로드(캐시 있음) 상태에서 `/api/products` 응답 500 강제 후 대기    | 기존 성공 데이터("총 30개") 유지 — 에러 UI로 전환되지 않음                                                                       | 최신 데이터가 아님을 알리는 표시가 없다                        |
| 에러 — 예상 밖 렌더링 오류     | 임시: `ProductListSection` 렌더 중 throw                                         | **경계가 없어 화면 전체를 잃는다** — Next 기본 화면 "This page couldn't load"(Reload·Back 버튼). 헤더·`main`·`title` 모두 사라짐 | 홈과 달리 목록에는 렌더 오류 경계가 없다                       |
| 빈 상태                        | 브라우저: 매칭 상품이 없는 검색어로 접속                                         | "총 0개" + "검색 결과가 없습니다 / 다른 검색어나 카테고리를 선택해 보세요"                                                       | —                                                              |

#### 기능 동작

| 기능                       | 확인 방법                                   | 기준 결과                                                                                  | 비고                                                                 |
| -------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 검색                       | 브라우저: 검색창에 "비니" 입력 후 검색 클릭 | URL push → `/products?q=비니&page=1`, "총 1개". 입력값은 검색창에 유지                     | —                                                                    |
| 카테고리 필터              | 브라우저: 2페이지에서 "패션" 선택           | URL → `?page=1&category=fashion`, 페이지 2→1 초기화, "총 6개"                              | —                                                                    |
| 정렬                       | 브라우저: 2페이지에서 "가격 낮은순" 선택    | URL → `?page=1&sort=price-asc`, 페이지 2→1 초기화, 3,000원부터 오름차순                    | —                                                                    |
| 페이지네이션               | 브라우저: "다음" 2회 클릭(1→2→3)            | 클릭마다 URL·카드 내용 변경, 마지막 페이지에서 "다음" 비활성화                             | —                                                                    |
| 범위 초과 페이지 자동 보정 | 브라우저: `/products?page=99` 직접 접속     | URL이 `/products?page=3`으로 자동 교정, 3페이지 상품 표시                                  | 교정 직후 "검색 결과가 없습니다"가 한 프레임 노출 — 버그로 볼지 미결 |
| URL 공유·새로고침          | curl: 위 각 URL 재요청                      | 서버가 매번 동일 결과 재현                                                                 | —                                                                    |
| 뒤로가기(히스토리)         | 브라우저: 검색 제출(push) 후 "뒤로"         | URL `/products` 복원, 검색창 새 DOM 노드로 교체(`key` 리셋)되며 빈 값 복원, "총 30개" 복원 | —                                                                    |

### 공통

| 항목                                    | 확인 방법                                                                      | 기준 결과                                                                                                                   | 비고                                           |
| --------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 서버·클라이언트 쿼리 키 일치(hydration) | 브라우저: `/products`·`/` 접속 후 2초간 네트워크 캡처                          | 두 페이지 모두 마운트 후 클라이언트 API 호출 **0건**                                                                        | -                                              |
| 장바구니·위시리스트 토글                | 브라우저: 카드의 "찜"/"담기" 클릭                                              | `aria-pressed="true"` 전환, 헤더 "위시리스트 0→1" 즉시 반영, 재클릭 시 원복                                                 | store 로직은 `createIdSetStore.test.ts`가 커버 |
| 페이지 이동 간 Zustand 유지             | 브라우저: 목록에서 찜·담기 켠 뒤 헤더 링크로 홈 → 목록 이동, 마지막에 새로고침 | 헤더 "위시리스트 1 / 장바구니 1"이 양쪽에서 유지, 홈의 같은 상품 버튼도 `aria-pressed="true"`. 새로고침 시 0 / 0으로 초기화 | -                                              |
| `pnpm check`                            | 터미널: `pnpm check`                                                           | test + lint + typecheck + build 성공, exit 0                                                                                | 2026-07-29                                     |

---

## R — Requirements

### 5주차까지의 기능·비기능 요구사항

- **기능**: 홈(배너·카테고리·인기/신상품), 상품 목록(검색·카테고리·정렬·페이지네이션), 장바구니·위시리스트 토글과 헤더 개수, URL 상태 복원, 로딩·에러·빈 상태 표시.
- **제외**: `dialog-demo`·`select-demo` 페이지는 Header nav·다른 코드 어디에서도 참조되지 않는 미사용 라우트로 확인되어(grep 0건) 커밋 `0c1e394c`에서 삭제했다. week-04 산출물이라는 이력은 git history로 보존된다. 남은 UI 킷 `components/ui/dialog`·`components/ui/select`와 `BundleSelect`·`SizeSelect`·`ThumbnailSelect`는 `shared/ui`로 옮긴다. 다만 **반입 기준은 "서로 독립적인 두 곳 이상에서 실제로 쓰일 것"이고, 데모 라우트 삭제로 이 다섯의 현재 소비자는 0이라 기준 미달이다.** 발제 제공 코드를 임의로 삭제하지 않기 위한 예외로 두고, 다음 주까지 소비자가 생기지 않으면 삭제를 재검토한다.
- **비기능**: 상태 Source of Truth 분리(서버=TanStack Query, URL=nuqs, 클라이언트=Zustand, 로컬=useState), 서버 프리페치 + hydration으로 중복 fetch·깜빡임 제거, 4xx/5xx 구분 재시도 정책, `pnpm check`(test·lint·typecheck·build) 상시 통과.

### 이번에 반드시 보존할 동작

- 0단계 — 동작 기준선의 모든 항목, 그리고 기존 단위 테스트 전체(`pnpm test`)의 통과 상태.

### 이번 주에 하지 않을 것과 그 이유

- **정상 UI 조작으로 도달할 수 없는 상태의 진입 경로 신설** — 홈의 로딩·에러·빈 상태와 목록의 첫 로딩은 0단계에서 임시 코드로 강제 재현해 기준값을 확보했다. 구조 이동이 아니라 기능 변경이므로 현 상태를 그대로 유지한다.
- **범위 초과 페이지 보정 시 빈 상태 깜빡임, 배경 재요청 실패 시 무표시** — 0단계에서 발견했으나 둘 다 기존 동작
- **상태 소유권·캐시 정책 변경** — 폴더 이동이 SSOT를 바꿀 이유가 없다(발제 원칙).
- **persist·장바구니 수량/옵션·로그인 병합** — 5주차 결정 유지. 구조 전환과 기능 확장을 같은 주에 섞지 않는다.
- **전역 에러 경계(`error.tsx`·`global-error.tsx`) 도입** — 홈은 페이지 단위 ErrorBoundary가 데이터 실패와 렌더 오류를 함께 받고, 목록은 결과 영역 인라인이 4xx·5xx를 갈라 처리한다. 도메인 단위 경계가 이미 있는 상태에서 전역 경계를 얹으면 같은 실패에 두 개의 fallback이 겹친다. `global-error.tsx`는 RootLayout이 프로바이더 조립만 해서 실패 경로가 없어 더더욱 불필요하다. 남는 공백(목록의 렌더 오류)은 O 섹션에 미처리로 명시한다.
- **디자인/스타일 개편** — 레이아웃 스타일은 커밋 `1afcdcf5`에서 예시 폴더를 벗어나 `src/app/commerce.css`로 승격을 마쳤다. 이번 주에는 `_app/styles/commerce.css`로 위치만 다시 옮기고 내용은 손대지 않는다. 시각 회귀 없이 구조 diff만 남기기 위함.

---

## A — Architecture

### 현재 구조의 문제 (5개)

1. **프론트와 mock 백엔드가 한 폴더에 혼재** — 서버 전용(mock 데이터 포함) 코드가 **클라 번들로 유출**될 수 있고, "서버/클라 경계"를 폴더가 아니라 파일명 규칙으로 억지로 구분하게 됨
2. 상품 카드 UI가 홈/목록에 **복제**
3. cart/wishlist 행위 코드가 **흩어져** 흐름 파악·삭제가 어려움
4. types/commerce.ts에 도메인/계약/mock 타입이 **한 파일에 뒤섞임**

### 기대 구조

```
app/                     # Next 전용 — FSD 레이어 밖
├── layout.tsx           #   → _app 재수출
├── page.tsx             #   → _pages/home
├── products/page.tsx    #   → _pages/product-list
├── favicon.ico
└── api/                 # mock 백엔드 전부: _data/ · route.ts · get*Data.ts

src/                     # FSD 코드만
├── _app/          (RootLayout.tsx · providers.tsx · styles/globals·commerce.css) — 파일 3개라 ui 세그먼트 없음
├── _pages/
│   ├── home/         (ui/HomePage·HomeSection·HomeErrorFallback·HomeLoadingFallback · api/homeQueries·getHome)
│   └── product-list/ (ui/Page·Section·SearchInput · model/filters·constants · lib/resolvePageOverflow · api/productQueries·getProductList·toProductListQuery)
├── widgets/
│   ├── header/       (Header — cart·wishlist 개수 조합)
│   └── product-card/ (entities 카드 + features 버튼 조합)
├── features/
│   ├── toggle-cart/     (ui/CartToggleButton)
│   └── toggle-wishlist/ (ui/WishlistToggleButton)
├── entities/
│   ├── product/  (ui/ProductCard · model/types — Product·Category·ProductSort·ProductListQuery·Response)
│   ├── cart/     (model/cartStore)
│   └── wishlist/ (model/wishlistStore)
└── shared/
    ├── api/    (apiFetch — ApiError·ApiErrorResponse · getQueryClient)
    ├── lib/    (formatPrice · createIdSetStore)
    └── ui/     (dialog · select · Bundle·Size·ThumbnailSelect)
```

### 레이어 선택 근거

**사용: shared / entities / features / widgets / \_pages** — 판단 축은 레이어마다 다르다. 파일 수는 어느 레이어에서도 기준이 아니다(FSD 공식문서 Layers·Slices and Segments와 발제 어디에도 최소 파일 수 조건이 없다. 발제는 "빈 폴더를 만들지 않는다"만 말한다). 재사용 여부도 전 레이어 공통 기준이 아니라 `features`·`widgets` 두 곳에만 적용한다 — 공식이 레이어별로 다른 축을 제시하기 때문이다. 아래는 레이어마다 판단 축 · 공식 근거 · 이 프로젝트의 판정 순으로 같은 형식을 따른다.

- **`shared`** — 판단 축: 도메인 무지. 공식: "business domains do not exist in Shared". 판정: `apiFetch`·`getQueryClient`·`formatPrice`·`createIdSetStore`는 Product·Cart를 몰라도 성립한다. 도메인 지식이 들어오는 순간 entity로 승격한다.
- **`entities`** — 판단 축: 도메인 개념. 공식: "concepts from the real world that the project is working with … the terms that the business uses". 판정: 상품·장바구니·위시리스트 셋 다 커머스 용어다. 소비자가 페이지든 위젯이든 소유 레이어는 바뀌지 않는다.
- **`features`** — 판단 축: 여러 페이지 재사용. 공식: "A good indicator that something needs to be a feature is the fact that it is reused on several pages". 판정: toggle 2종이 홈·목록 두 페이지의 카드에서 쓰인다(현재 `ProductActions` 한 컴포넌트를 두 페이지가 소비 중). 헤더는 개수만 표시하므로 소비자가 아니다.
- **`widgets`** — 판단 축: 여러 페이지 재사용. 공식: "reused on several pages". 판정: `product-card`는 홈·목록 2페이지로 기준 충족. `header`는 소비 지점이 `_app`의 RootLayout 한 곳이라 기준 미달이나, `cart`·`wishlist` 두 entity를 조합하는 블록이라 예외로 채택한다 — `_app`에 두면 조립 전용이어야 할 레이어가 도메인 상태를 알게 된다. 재사용이 아닌 근거를 쓰는 유일한 슬라이스다.
- **`_pages`** — 판단 축: 라우트 단위 조합. 공식: "rename both `app` and `pages` FSD layers to `_app` and `_pages`, regardless of which router you use". 판정: 라우트당 슬라이스 하나. `src/pages`는 쓰지 않는다.
- **`_app`** — 판단 축: 도구 제약. 공식: 위 rename 권고. 판정: Next가 `/app`과 `/src/app`을 둘 다 App Router로 인식하므로, 라우팅을 루트로 올린 이상 `src/app`은 두 번째 라우터 디렉토리가 된다. 담는 것은 프로바이더·전역 스타일·루트 레이아웃 셋이며, 전역 에러 fallback은 두지 않는다(R 섹션).

### 허용/금지 import

- 아래 표 금지 import 레이어를 제외한 import 패턴은 허용
- 슬라이스는 아래 레이어의 슬라이스만, 그 슬라이스의 public API로만 import

| 레이어        | 금지 import 레이어                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `shared`      | entities · features · widgets · \_pages · \_app (자기 위 전부). 사실상 절대 경로 자체를 쓰지 않는다      |
| `entities`    | features · widgets · \_pages · \_app + 다른 entities 슬라이스                                            |
| `features`    | widgets · \_pages · \_app + 다른 features 슬라이스                                                       |
| `widgets`     | \_pages · \_app + 다른 widgets 슬라이스                                                                  |
| `_pages`      | \_app + 다른 \_pages 슬라이스                                                                            |
| `_app`        | 상위가 없다. 다른 \_app 모듈을 절대 경로로 참조하는 것만 금지                                            |
| 전 레이어 공통 | 어느 레이어든 슬라이스 루트보다 깊은 경로(public API 우회). shared는 슬라이스가 없어 대상 아니다        |

#### 예시

- ✅ `_pages/product-list` → `widgets/product-card`
- ✅ `entities/wishlist` → `shared/lib`
- ❌ `entities/product` → `features/toggle-wishlist` (역방향)
- ❌ `entities/cart` → `entities/wishlist` (동일 layer)

### 마이그레이션 계획 (단계별 커밋 + 단계별 검증)

#### 검증 공통 규칙

- 도구 표기는 0단계와 동일하게 — 터미널 / curl / 브라우저 / 임시. **기준선을 만든 것과 같은 도구로** 재검증해야 대조된다.
- 임시 재현 코드는 관찰 직후 되돌리고, 커밋 직전 `git diff`로 확인한다(발제 4단계 요구).
- 단계마다 커밋 1개. `pnpm check`는 전 단계 공통 게이트라 아래 표에는 그 단계에서 특별히 잡히는 것만 적었다.
- 통과 = 0단계 기준 결과와 문구·수치까지 동일. 다르면 의도한 변경인지 회귀인지 판정해 기록한다.

#### 단계

| 단계               | 하는 일                                                                                                                                                                                          | 검증                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0. 사전 정리**   | 파일 이동 계획 확정(매핑 정본은 아래 파일 매핑표). 코드 변경 없음                                                                                                                                | `pnpm check` exit 0 + **테스트 개수 기록**(이후 전 단계 대조 기준) · `git status` clean                                                                                                                                                                     |
| **A. 경계 세우기** | `src/app` 네 갈래 분해 — 라우팅·favicon·`api/` → 루트 `app/`, providers·css·layout 본문 → `src/_app`, `getQueryClient`·`apiFetch` → `shared/api`. **`src/app` 완전 제거**                        | `pnpm check` — **특히 build 성공** · curl `/api/home`·`/api/products` 200 · curl `/`·`/products` 응답 HTML에 카드 포함 · 브라우저 hydration 클라 호출 **0건** · 홈·목록 정상 화면(전역 CSS 포함) · `ls src/app` 없음                                        |
| **B. 페이지 확정** | `_pages` 신설 + 세그먼트 재편. `hooks/` 해체, 라우팅에 남은 프리페치·fallback을 슬라이스 `ui`로 추출. **여기서 App/Pages/Shared 완성 — 중단 가능 지점**                                          | 브라우저 검색·카테고리·정렬·페이지네이션·범위 초과 보정·뒤로가기 전부 · curl 각 URL 재요청 동일 결과 · hydration 0건 재확인 · 목록 빈 상태·4xx·5xx·재시도 복구 · **임시: 홈 fallback 4종 — 추출 전후 문구·레이아웃 동일** · `grep -rn "hooks/" src/` 0건 |
| **C. 공유 확정**   | `formatPrice`·`createIdSetStore` → shared. 소비자 0인 UI킷 6개(dialog·select·세 Select)는 반입 여부가 R 섹션 예외 판단 대상                                                                      | `pnpm check` — 두 테스트가 이동 후에도 수집되는지 · 가격 `23,000원` 형태 유지 · 토글 동작 · `grep -rln "components/ui" src/` 결과가 A단계와 동일                                                                                                            |
| **D. 도메인 분리** | `types/commerce.ts` 분해(소비자 14파일 — 영향 최대라 단독 커밋), store → `entities/*/model`, `MockApiScenario` → `app/api/_data/`                                                                | `pnpm check` — typecheck가 타입 회귀 대부분 보증 · 토글 · 페이지 이동 간 유지 + 새로고침 초기화 · 임시: scenario=empty로 홈 빈 상태                                                                                                                         |
| **E. 조합**        | 카드 중복 제거 — `ProductCard`(actions slot) 추출 + `widgets/product-card`·`widgets/header` 조합. **이동 커밋과 분리**                                                                           | **추출 직전/직후 카드 outerHTML 캡처 후 diff** · 홈·목록 카드 구성과 개수(6+6 / 12개) · 토글 · 필터 전환 중 `aria-busy` 유지                                                                                                                                |
| **F. features 확정** | `ProductActions`를 `features/toggle-cart/ui/CartToggleButton`·`features/toggle-wishlist/ui/WishlistToggleButton`으로 분해. 레이어 선택 근거·I 섹션·파일 매핑표가 이미 features 채택을 전제하므로 판정이 아니라 완성 단계다 | `pnpm check` · 카드 outerHTML 대조(찜·담기 버튼 마크업 동일) · 토글 동작 · `grep -rn "features/toggle-" src/` — `widgets/product-card`에서 소비 2건(각 feature당 1) · (도입 시) `npx steiger src` insignificant-slice 위반 0건                            |

### 파일 매핑표

표기: **[이동]** 경로가 바뀐다 / **[유지]** 현 경로 그대로 둔다 / **[신규]** 마이그레이션 중 새로 만든다. `(분해)`는 한 파일이 둘 이상으로 갈라져 이동한다는 뜻이다. **현재 [유지] 판정은 0건** — `src/` 추적 파일 55개가 모두 이동 대상이며, 남는 폴더는 없다.

| 현재 위치                                                                                                       | 목표 위치                                                                                                                                                                                       | 레이어 / 슬라이스 / 세그먼트   | 이동 또는 유지하는 이유                                                                              |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/app/`의 `layout.tsx` · `page.tsx` · `products/page.tsx` · `favicon.ico`                                    | 루트 `app/` 동일 경로                                                                                                                                                                            | 레이어 밖 (어댑터)             | **[이동]** 재수출만 남기고 본문은 각 소유 슬라이스로(아래 행들)                                       |
| `src/app/api/`의 `route.ts` · `get*Data.ts` · `_data/commerce.ts`                                               | `app/api/`                                                                                                                                                                                       | 레이어 밖 (mock)               | **[이동]** 외부 시스템 대역 전부를 `src` 밖으로(문제 1번)                                             |
| `layout.tsx` 본문                                                                                               | `src/_app/RootLayout.tsx`                                                                                                                                                                        | `_app`                         | **[이동]**(분해) 폰트·metadata·마크업 소유 — 라우팅 파일에는 재수출만 남는다                          |
| `src/app/providers.tsx`                                                                                         | `src/_app/providers.tsx`                                                                                                                                                                         | `_app`                         | **[이동]** 전역 프로바이더 조립                                                                       |
| `src/app/globals.css` · `commerce.css`                                                                          | `src/_app/styles/`                                                                                                                                                                               | `_app` / — / `styles`          | **[이동]** RootLayout 한 곳 전역 1회 로드(결정표). 내용 무변경                                        |
| `src/app/getQueryClient.ts`                                                                                     | `src/shared/api/getQueryClient.ts`                                                                                                                                                               | `shared` / — / `api`           | **[이동]** 소비자 `_pages`가 `_app`을 참조할 수 없음(허용/금지 import)                                |
| `src/app/api/apiFetch.ts`                                                                                       | `src/shared/api/apiFetch.ts`                                                                                                                                                                     | `shared` / — / `api`           | **[이동]** 도메인 무지 HTTP 래퍼 + `ApiError`                                                         |
| `src/lib/formatPrice.ts`                                                                                        | `src/shared/lib/formatPrice.ts`                                                                                                                                                                  | `shared` / — / `lib`           | **[이동]** 도메인 무관 포맷터 — 정책 포함 시 entity 승격                                              |
| `src/app/store/createIdSetStore.ts`                                                                             | `src/shared/lib/createIdSetStore.ts`                                                                                                                                                             | `shared` / — / `lib`           | **[이동]** 두 entity 공유 팩토리 — entity에 두면 슬라이스 간 import 위반(허용/금지 import)            |
| `src/components/ui/dialog` · `select`, `src/components/commerce/BundleSelect` · `SizeSelect` · `ThumbnailSelect` | `src/shared/ui/` 하위 동명 폴더                                                                                                                                                                  | `shared` / — / `ui`            | **[이동]** 소비자 0이라 shared 반입 기준은 미달이나 발제 코드 보존 예외로 이동(R 섹션), 다음 주 재검토 |
| `src/types/commerce.ts`                                                                                         | 분해 — 도메인·목록 계약 타입 → `entities/product/model/types.ts`, `HomeResponse` → `_pages/home/api/getHome.ts`, `ApiErrorResponse` → `shared/api`, `MockApiScenario` → `app/api/_data/`        | 복수                           | **[이동]**(분해) 통짜 파일의 타입별 소유자 분리(문제 4번·결정표). 분해 후 원본 삭제                   |
| (신규 — 두 Section 중복 카드 마크업 추출)                                                                       | `src/entities/product/ui/ProductCard.tsx`                                                                                                                                                        | `entities` / `product` / `ui`  | **[신규]** actions slot 받는 표현 카드(문제 2번·결정표) — E단계                                       |
| `src/app/store/cart/cartStore.ts`                                                                               | `src/entities/cart/model/cartStore.ts`                                                                                                                                                           | `entities` / `cart` / `model`  | **[이동]** "무엇이 담겼나"는 도메인 상태(결정표)                                                      |
| `src/app/store/wishlist/wishlistStore.ts`                                                                       | `src/entities/wishlist/model/wishlistStore.ts`                                                                                                                                                    | `entities` / `wishlist` / `model` | **[이동]** 위와 동일                                                                               |
| `src/components/commerce/ProductActions/ProductActions.tsx`                                                     | 분해 → `features/toggle-cart/ui/CartToggleButton.tsx` · `features/toggle-wishlist/ui/WishlistToggleButton.tsx`                                                                                   | `features` / 각 슬라이스 / `ui` | **[이동]**(분해) 행위 단위 분리 — 위시리스트 폴더째 삭제 성립 조건(F단계)     |
| `src/components/layout/Header.tsx`                                                                              | `src/widgets/header/ui/Header.tsx`                                                                                                                                                               | `widgets` / `header` / `ui`    | **[이동]** 두 entity 조합 블록(레이어 근거의 예외 항목)                                               |
| (신규 — 카드 + 토글 버튼 조합)                                                                                  | `src/widgets/product-card/ui/ProductCardWithActions.tsx`                                                                                                                                         | `widgets` / `product-card` / `ui` | **[신규]** 조합 지점 1곳(결정표) — E단계                                                           |
| `src/app/page.tsx` 본문 + 인라인 fallback                                                                       | `_pages/home/ui/` — `HomePage` · `HomeErrorFallback` · `HomeLoadingFallback`                                                                                                                     | `_pages` / `home` / `ui`       | **[이동]**(분해) 프리페치·경계 본문과 fallback은 슬라이스 내부(I 섹션)                                |
| `src/home/HomeSection.tsx`                                                                                      | `_pages/home/ui/HomeSection.tsx`                                                                                                                                                                 | `_pages` / `home` / `ui`       | **[이동]** 홈 전용 섹션                                                                               |
| `src/app/api/home/getHome.ts` · `homeQueries.ts`                                                                | `_pages/home/api/`                                                                                                                                                                               | `_pages` / `home` / `api`      | **[이동]** request + query — 소비자가 홈 하나                                                         |
| `src/app/products/page.tsx` 본문                                                                                | `_pages/product-list/ui/ProductListPage.tsx`                                                                                                                                                     | `_pages` / `product-list` / `ui` | **[이동]** searchParams 파싱·프리페치 본문                                                          |
| `src/productList/ProductListSection.tsx` · `SearchInput.tsx`                                                    | `_pages/product-list/ui/`                                                                                                                                                                        | `_pages` / `product-list` / `ui` | **[이동]** 목록 전용 — 검색은 feature 미승격(결정표)                                                |
| `src/productList/productListFilters.ts` · `productListConstants.ts` · `hooks/useProductListFilters.ts`          | `_pages/product-list/model/`                                                                                                                                                                     | `_pages` / `product-list` / `model` | **[이동]** URL 상태 parsers·상수·훅 — `hooks/` 종류 폴더 해체                                    |
| `src/productList/resolvePageOverflow.ts`                                                                        | `_pages/product-list/lib/`                                                                                                                                                                       | `_pages` / `product-list` / `lib` | **[이동]** 순수 계산이라 shared 후보도 성립하나 소비자가 한 곳뿐(결정표)                            |
| `src/app/api/products/getProductList.ts` · `productQueries.ts` · `toProductListQuery.ts`                        | `_pages/product-list/api/`                                                                                                                                                                       | `_pages` / `product-list` / `api` | **[이동]** request·query·mapper 셋(해소 2번) — 소비자가 목록 하나(결정표)                           |

### 애매한 파일 결정표 (4건)

| 대상                 | 후보 A                     | 후보 B                       | 최종 결정                                                                                          | 기준                                                                                                                                            |
| -------------------- | -------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductCard`        | `entities/product/ui`      | `widgets/product-card`       | **둘 다(역할 분리)** — 표현은 entity의 `ProductCard`, 행위 조합은 widget의 `ProductCardWithActions` | 카드는 두 페이지에서 쓰이고(entities), 버튼 조합은 features를 참조해야 한다(entities→features 역방향 금지). 두 역할을 한 컴포넌트로 묶을 수 없어 나눈다 |
| 목록 queryOptions    | `entities/product-list/api` | `_pages/product-list/api`    | `_pages/product-list/api`                                                                          | 상품 데이터라는 점에서는 entity 후보지만 검색·정렬·페이지네이션 쿼리라 소비자가 목록 페이지 하나                                                 |
| `Header`             | `_app`                     | `widgets/header`             | `widgets/header`                                                                                   | 소비 지점이 한 곳이지만, 여러 페이지가 동일한 헤더 소비                                                                                          |
| `resolvePageOverflow` | `shared/lib`              | `_pages/product-list/lib`    | `_pages/product-list/lib`                                                                          | 순수 계산이라 도메인을 모르는 조건은 충족하지만, 소비자가 `ProductListSection` 하나                                                              |

---

## D — Data Model (상태 분류표)

| 상태                | Source of Truth     | 소유 슬라이스/레이어                                                                                            | 소비하는 곳                                          | 중복 저장하지 않는 방법                                                                                                                       |
| ------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 상품 조회 결과      | 서버/TanStack Query | 쿼리 정의: `_pages/home/api` · `_pages/product-list/api`. 캐시 인스턴스: `_app`. 서버 프리페치 팩토리: `shared/api` | 홈 화면, 상품 목록 화면                              | 응답을 store·state로 복사하지 않고 항상 쿼리 훅으로 캐시 직접 구독. 서버 프리페치도 같은 queryOptions 공유                                     |
| 검색·정렬·페이지    | URL/nuqs            | `_pages/product-list` — `model` 세그먼트                                                                          | 상품 목록 화면 — 검색창·카테고리·정렬·페이지네이션   | URL이 유일 원본. 서버 렌더링도 같은 parsers를 써서 파싱하므로 서버·클라이언트 쿼리 키가 일치한다. 검색창 확정 전 값만 로컬 버퍼(`key` 리셋)   |
| 장바구니·위시리스트 | Zustand             | `entities/cart` · `entities/wishlist` — 각 `model` 세그먼트                                                       | 헤더의 개수 표시, 상품 카드의 담기·찜 버튼           | ID `Set<string>`만 저장 — 서버 응답 복사 금지. 개수는 `ids.size` selector 파생값                                                              |
| Dialog 열림 여부    | React 로컬 상태     | `shared/ui`                                                                                                       | 현재 없음 — 데모 화면 삭제로 소비 화면 0             | URL·Zustand·Query 어느 쪽에도 넣지 않는다. controlled로 써도 원본은 열림 여부를 선언한 컴포넌트 하나이고, Dialog 내부 Context는 그 값을 하위로 전달만 한다 |

---

## I — Interface

- **슬라이스의 공개/숨김** 구현
  - **`_pages`** — 판단 축: 라우트 어댑터가 쓰는 최소치. 공개: 페이지 컴포넌트 · `metadata`. 숨김: 프리페치 구현, Section·`SearchInput`, fallback 3종, `model`·`api` 전체.
  - **`widgets`** — 판단 축: 조합의 결과만. 공개: `Header` · `ProductCardWithActions`. 숨김: 어떤 entity·feature를 엮었는지.
  - **`features`** — 판단 축: 행위 하나에 진입점 하나. 공개: `CartToggleButton` · `WishlistToggleButton`. 숨김: store 구독 방식.
  - **`entities`** — 판단 축: 도메인 개념과 상태 접근 수단까지. 공개: `ProductCard`·도메인/계약 타입, cart·wishlist store 훅. 숨김: `createIdSetStore` 기반이라는 사실. cross-import `@x`는 공식이 entities에만 허용하는 표기지만 entity 간 참조가 0건이라 쓰지 않는다.
- **ProductCard 조합**: `actions?: ReactNode` slot → `widgets/product-card`가 카드+토글 버튼 조합. 역방향 의존 없음, 조합 지점 1곳.
- **Public API 결정**: 슬라이스 루트에만 "계약" index.ts (named export만, `export *` 금지, 세그먼트 index 금지, shared 배럴 금지 — FSD 공식의 tree-shaking·순환 경고 반영). 목적은 경로 단축이 아니라 경계 선언.

---

## O — Optimization

- TanStack Query 캐시 정책 유지/변경 근거 — 유지 결정. 폴더 이동은 신선도 요구를 바꾸지 않음
- 로딩·에러 경계 범위
  - 로딩 — 홈 화면 `HomeListSection`이 경계이고, 상품 목록에서는 목록 데이터 표시 부분이 경계
  - 에러 — 두 화면 모두 로딩 처리와 일관되게 처리함. 홈 화면 `HomeListSection`이 경계이고, 상품 목록에서는 목록 데이터 표시 부분이 경계
- 이번 주에 하지 않을 최적화와 이유

### 에러 처리 표

| 실패 유형                      | 처리 위치           | 경계 전파 | 사용자 UI                                                  | 재시도 방법                    | 이유                                            |
| ------------------------------ | ------------------- | --------- | ---------------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| 목록 조회 실패(5xx·네트워크)   | ProductListSection  | X         | 결과 영역 실패 문구 + 다시 시도                            | 다시 시도 UI를 통해 refetch 호출 | 재시도 가능한 에러                              |
| 잘못된 검색 조건(4xx)          | ProductListSection  | X         | 서버 메시지 + 필터 초기화                                  | X                              | 입력이 원인 — 재요청 아닌 입력 교정이 복구 수단 |
| 예상 밖 렌더링 오류            | HomeSection         | O         | 홈: `HomeErrorFallback`(헤더 유지) / 목록: Next 기본 화면   | X                              | 홈은 전체 서브트리 대체 가능한 화면             |

### 실패 재현 결과

- **부분 표시·재시도**: `scenario=error`(500)로 재현 — 필터 유지 + 결과 영역만 실패, refetch로 새로고침 없이 복구.
- **throwOnError 기준**: 목록은 미사용(모두 인라인, 4xx/5xx 복구 UI만 구분). 홈은 useSuspenseQuery라 항상 경계 전파. 표와 일치.
- **전역 경계 미도입**: 루트 `app/error.tsx`·`global-error.tsx` 모두 만들지 않는다. 남는 공백은 목록의 렌더 오류 하나며 0단계 기준선 그대로 유지. 홈 fallback은 컴포넌트 추출 전후로 문구·레이아웃이 같은지 재현 확인.
- **공통 에러 타입**: `ApiError(status, message)`=HTTP, fetch TypeError=네트워크. 문구는 소비 컴포넌트가 결정(shared에 화면 문구 금지). 비즈니스 오류 타입은 YAGNI.
- **핸들러·비동기 오류**: ErrorBoundary는 렌더 오류만 잡음. 비동기 fetch는 Query가 error 값으로 변환, 핸들러는 현재 throw 경로 없음(mutation 도입 시 try/catch).
- **loading.tsx vs isPending**: loading.tsx 미사용 — route 전체 로딩은 필터까지 가려 요구와 충돌. 홈=Suspense fallback, 목록=isPending·isPlaceholderData가 결과 영역만 담당.
