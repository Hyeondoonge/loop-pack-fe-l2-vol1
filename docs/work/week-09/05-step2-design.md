# 2단계 계측 설계 — `ts`·`device` · 계측 경계 · 발화 조건

- 대상: `docs/assignments/week-09.md` 2단계(135~154번 줄), 체크리스트(322~330번 줄)
- 선행 결정
  - [04-step2-questions.md](./04-step2-questions.md) — 질문 1(①·②), 질문 2(2-a·2-b·2-c), 질문 5(5-a·5-b) 확정분
  - [02-new-pages-design.md](./02-new-pages-design.md) — 5장 "계측 연결점"(주문 시작·완료 지점), 9장 "장바구니는 전체 새로고침에서 비워진다"
  - [03-implementation-notes.md](./03-implementation-notes.md) — 7번 "장바구니 지속성(`persist`)을 넣지 않는다"와 대안 비교, E2E 진입 경로
- 이 문서가 다루는 범위: 질문 2의 잔여 항목(`ts`·`device`), 질문 3(계측 경계), 질문 4(발화 조건), 그리고 5-c(`initAnalytics()` 위치)
- 상태: **설계 확정** (2026-09-04). 2개 에이전트 교차 검토에서 나온 21건 중 **높음 1·2번(완료조건 시퀀스, 레코드 유실)을 반영**했다. 나머지 미반영 항목은 문서 끝 "교차 검토 잔여 항목" 참조.

## 착수 시점 실측 (2026-09-04)

설계의 전제가 된 코드 상태. 바뀌면 설계도 다시 봐야 한다.

| 항목 | 실측 |
| --- | --- |
| FSD 레이어 | `shared` → `entities` → `features` → `widgets` → `_pages` → `_app` (`eslint.config.mjs`의 `FSD_LAYERS`) |
| 경계 강제 | `eslint-plugin-boundaries`, `default: 'disallow'` |
| **`src/analytics` 등록 여부** | **없음 — 경계 하네스의 사각지대** (아래 프로브 결과) |
| `logger.track()` | `{ ...commonProperties(), ...properties }`를 **호출 즉시** 평가. 플러시 시점이 아니다 |
| 초기화 전 큐 | 최대 100건, 초과 시 `queue.shift()`로 **앞부터 버림** |
| `consoleProvider.track()` | `window.__analytics`에 `{ event, properties }`로 쌓고 `console.info` |
| `AnalyticsProvider` | `track(event, properties)` 2인자 고정 |
| `RootLayout` | 서버 컴포넌트. `cookies()` → `authQueries.me()` prefetch → dehydrate |
| `Providers` | `'use client'`. `QueryCache`/`MutationCache`의 `onError`가 `SessionExpiredError`를 잡아 `redirectToLogin()` |
| `ProductListSection` | `'use client'`. nuqs(`useQueryStates`)로 필터, `useEffect` 1개(페이지 초과 보정) 사용 중 |
| `CartToggleButton` / `WishlistToggleButton` | `'use client'`. 토글 — 클릭 전 `isInCart`/`isInWishlist`로 방향 판정 가능 |
| `OrderFormSection` | `'use client'`. `useSuspenseQuery(productCatalogQueries.lookup())` 사용 — **Suspense 경계 안** |
| `login()` | `apiFetch('/api/auth/login', ...)` — **제네릭 미지정이라 반환 타입이 `unknown`** |
| 상품 이미지(`next/image`) | `ProductCard`(entities) · `CartSection` · `OrderLine` · `ThumbnailSelect` 4곳. `onError` 핸들러 없음 |

### 경계 프로브 결과

`src/features/toggle-cart/ui/`에 임시 파일을 만들어 `pnpm exec eslint`로 확인(확인 후 삭제).

| import | 결과 |
| --- | --- |
| `@/entities/cart/model/cartStore` (내부 경로) | **차단** — `boundaries/dependencies` 에러 |
| `@/analytics/logger` (features에서) | **통과** — 규칙이 인지하지 못함 |

과제 147번 줄("계측 코드가 화면 로직에 섞이지 않게 경계를 둬요")은 **설계로 지켜야 하고, 지켜졌는지 린트가 알려주지 않는다.**

### 시드 로그 props (설계 기준선)

| 이벤트 | props | 값 분포 |
| --- | --- | --- |
| `product_list_view` | `category` `sort` `page` | — |
| `category_filter_change` | `category` | `digital` 639 · `fashion` 634 · `goods` 628 · `casual` 595 · `home` 581 |
| `sort_change` | `sort` | `popular` 256 · `price-desc` 239 · `latest` 235 · `price-asc` 218 |
| `page_change` | `page` | 전부 `2` (1,779건) |
| `cart_add` | `productId` `quantity` | — |
| `wishlist_add` | `productId` | — |
| `login_start` / `login_success` | `from` | 전부 `cart` |
| `login_fail` | `reason` | 전부 `INVALID_CREDENTIALS` (121건) |
| `order_start` | `productId` (**단수**) | — |
| `order_complete` | `productId` `totalPrice` | — |
| `client_error` | `code` `productId` | `code`는 전부 `IMAGE_LOAD_FAILED` |

---

## 1. 질문 2 잔여 — `ts`

```ts
setCommonProperties(() => ({ ts: new Date().toISOString(), ... }));
```

**근거**: `logger.ts`의 `track()`이 `{ ...commonProperties(), ...properties }`를 호출 즉시 평가한다(플러시 시점이 아님). 따라서 공통 프로퍼티 콜백에서 만든 `ts`가 이벤트 발생 시각으로 정확하다. provider에 맡기면 큐에 쌓였다 플러시될 때 찍혀 **초반 이벤트의 시각이 전부 초기화 시점으로 뭉친다.** 형식은 시드와 같은 ISO 8601 UTC.

## 2. 질문 2 잔여 — `device`

```ts
// src/analytics/device.ts
export function getDevice(): 'mobile' | 'tablet' | 'desktop' | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  if (/Mozilla|Chrome|Safari|Firefox|Edg/i.test(ua)) return 'desktop';
  return null;
}
```

**근거**: 시드 값이 `mobile`·`desktop`·`tablet` — **화면 크기가 아니라 기기 종류**다. 뷰포트 폭으로 재면 데스크톱에서 창을 줄였을 때 `mobile`로 잡혀 다른 것을 재게 된다. `null`(시드 486건, 2.2%)은 판정 실패와 SSR에 그대로 쓴다. 새 의존성을 추가하지 않는다(CLAUDE.md).

---

## 3. 질문 3 — 계측 경계

### 구조

```
화면 (features · widgets · _pages · _app)
  ↓  trackCartAdd(productId) 처럼 이벤트별 함수만 호출
src/analytics/events.ts        ← 이름·props 스키마의 단일 출처 (신규)
  ↓  track(name, props)
src/analytics/logger.ts        ← 스타터, 무수정
  ↓  provider.track(event, properties)
src/analytics/recordProvider.ts ← 신규. 시드 모양으로 조립 + 콘솔 출력. 등록되는 유일한 provider

src/analytics/consoleProvider.ts ← 스타터. 파일은 남기되 registerProviders에 넣지 않는다
```

### 화면이 `logger.track()`을 직접 부르지 않는 이유

- 이벤트 이름 문자열과 props 스키마가 화면 곳곳에 흩어지면 오타·스키마 불일치를 타입이 못 잡는다. `events.ts`에 모으면 함수 시그니처가 스키마를 강제한다.
- 3단계에서 이름을 바꾸거나 props를 늘릴 때 고칠 곳이 한 곳이다.

### `events.ts`를 `src/analytics/`에 두는 이유

스타터가 이미 만들어 둔 자리다. `shared/lib`로 옮기면 "비즈니스 로직 없는 범용" 성격과 어긋난다 — 이벤트 이름은 도메인 지식이다.

### 2-a(시드 모양 기록) 실현 — provider를 하나 추가한다

```ts
// src/analytics/recordProvider.ts — 등록하는 provider는 이것 하나
const RECORDS_KEY = 'analytics.records';

function readRecords(): unknown[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(RECORDS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const recordProvider: AnalyticsProvider = {
  name: 'record',
  // 기존 레코드를 지우지 않는다 — 전체 페이지 이동 뒤에도 같은 탭이면 같은 세션이다(2-b).
  initialize() {},
  track(event, properties) {
    if (typeof window === 'undefined') return;
    const { sessionId, ts, device, userId, ...props } = properties;
    const record = { sessionId, ts, name: event, props, device, ...(userId !== undefined && { userId }) };
    sessionStorage.setItem(RECORDS_KEY, JSON.stringify([...readRecords(), record]));
    console.info(`[analytics] ${event}`, record);   // 개발 중 확인도 여기서 함께
  },
  identify() {}, reset() {}
};
```

### 버퍼를 메모리가 아니라 `sessionStorage`에 두는 이유

**2-b와의 정합성이다.** 세션을 탭 생존 기간으로 정의했는데(2-b) 메모리 배열은 **페이지 수명**이라 세션보다 짧다. 전체 페이지 이동이 일어나는 순간 그때까지의 레코드가 전부 사라진다.

| 전환 | 메모리 배열이면 유실되는 것 |
| --- | --- |
| 가드 리다이렉트 (미로그인 → 보호 경로) | 그 전까지의 `product_list_view` · `cart_add` 전부 |
| 만료 리다이렉트 (`redirectToLogin()`의 `window.location.replace`) | 그 전까지 전부 **+ `session_expired` 자신** |
| 새로고침 | 전부 |

특히 두 번째 줄이 5-b 결정을 무력화한다 — 만료를 "실패 비용의 분자"로 쓰기로 했는데 그 레코드가 기록 직후 사라진다.

`sessionStorage`의 수명은 **탭 생존 기간과 정확히 일치**한다. 2-b가 정의한 세션 그 자체이고, `sessionId`도 이미 같은 저장소에 둔다. `track()`이 동기라 `window.location.replace` 직전 호출도 write가 먼저 끝난다.

- 비용: 이벤트마다 JSON 직렬화. 레코드 200바이트 × 수백 건이면 할당량(~5MB)에 무의미한 수준이다.
- `initialize()`가 비어 있는 것이 핵심이다. 여기서 배열을 초기화하면 전체 이동 뒤 첫 로드에서 이전 레코드를 지워, 메모리 배열과 같은 문제로 되돌아간다.
- 검토한 대안: 만료 이벤트만 따로 `sessionStorage`에 적기 — 코드량은 비슷한데 다른 이벤트의 유실은 그대로 남는다.

**근거**: `provider.ts` 주석이 "이 인터페이스를 구현해 `registerProviders()`에 넘긴다"고 확장점을 명시해 뒀다. 스타터 파일(`logger.ts`·`consoleProvider.ts`)을 건드리지 않으므로 과제 63번 줄·체크리스트 330번("이벤트 로거를 직접 다시 만들지 않았는가")에 안전하다. 2-a가 요구한 최상위 조립의 **두 갈래**(공통 `sessionId`·`ts`·`device` + 이벤트별 `userId`)를 이 한 곳에서 처리한다.

**`consoleProvider`를 등록하지 않는 이유**: 둘 다 등록하면 같은 데이터가 두 모양(`window.__analytics`, `window.__analyticsRecords`)으로 쌓인다. 콘솔 출력은 `recordProvider`가 겸한다. 과제 148번 줄("`consoleProvider`로 충분합니다")은 "실제 분석 도구를 안 붙여도 된다"는 뜻이지 반드시 등록하라는 요구가 아니고, `logger.ts`를 건드리지 않으므로 체크리스트 330번에 그대로 안전하다. 파일은 스타터 상태로 남긴다.

이 결정에 이르기까지의 trade-off 검토는 아래 "확정된 판단 5개"의 1번에 남긴다.

---

## 4. 질문 4 — 발화 조건

| 이벤트 | 위치 | 시점 | props | 시드 대비 |
| --- | --- | --- | --- | --- |
| `product_list_view` | `ProductListSection` | 마운트 1회 | `{ category, sort, page }` | 동일 |
| `category_filter_change` | `handleCategoryChange` | 변경 액션 | `{ category }` | 동일 |
| `sort_change` | `handleSortChange` | 변경 액션 | `{ sort }` | 동일 |
| `page_change` | `ProductResults`의 `onPageChange` | 변경 액션 | `{ page }` | 동일 |
| `cart_add` | `CartToggleButton` | 클릭 시 `isInCart === false` | `{ productId, quantity: 1 }` | 동일 |
| `cart_remove` | `CartToggleButton` | 클릭 시 `isInCart === true` | `{ productId }` | **신설** (②-2) |
| `wishlist_add` | `WishlistToggleButton` | 클릭 시 `isInWishlist === false` | `{ productId }` | 동일 |
| `wishlist_remove` | `WishlistToggleButton` | 클릭 시 `isInWishlist === true` | `{ productId }` | **신설** (②-2) |
| `login_start` | `LoginForm` | 마운트 1회 | `{ from }` | 값 형식 다름 |
| `login_success` | `handleSubmit`의 `mutateAsync` 성공 직후 | 액션 | `{ from }` + `userId` | 동일 |
| `login_fail` | `handleSubmit`의 `catch` | 액션 | `{ reason }` | 값 확장 |
| `order_start` | 주문서 진입 | 마운트 1회 | `{ productIds }` + `userId` | **단수→배열** (②-5) |
| `order_complete` | `orderMutation.onSuccess` | 성공 | `{ productIds, totalPrice }` + `userId` | **단수→배열** |
| `session_expired` | `src/_app/redirectToLogin.ts` | 만료 감지 | `{ from: window.location.pathname }` | **신설** (5-b) |
| `client_error` | `ProductCard`(entities)의 `next/image` `onError` | 로드 실패 | `{ code: 'IMAGE_LOAD_FAILED', productId }` | 동일 |

`identify()`는 `login_success`와 같은 자리, `reset()`은 로그아웃 `onSuccess`(5-a 결정). 만료 시 `reset()`은 부르지 않는다.

### 값 정의가 갈리는 세 곳

**`login_start.from` · `login_success.from`**

시드는 화면 이름(`'cart'` 100%)인데 내 앱은 `searchParams.get('next')`에서 온다. **경로를 넣고 매핑 표에 형식 차이를 기록한다** — 경로→화면이름 매핑 테이블을 만들 실익이 없다.

단 `proxy.ts`가 `next`를 **절대 URL**로 만들므로(`01-auth-guard-design.md` 5번 결정: `request.nextUrl.href`) `searchParams.get('next')`는 `http://localhost:3000/orders/new`를 돌려준다. **`pathname`만 잘라 넣는다** — origin이 로컬·운영에서 달라 그대로 넣으면 같은 화면이 두 값으로 집계된다. `resolveLoginDestination`이 이미 같은 파싱을 하므로 방식을 맞춘다. `next`가 없는 직접 진입은 `null`.

**`login_fail.reason`**

| 조건 | reason |
| --- | --- |
| `ApiError` 401 | `INVALID_CREDENTIALS` (시드와 동일) |
| `ApiError` 400 | `BAD_REQUEST` |
| `ApiError` 5xx | `SERVER_ERROR` |
| 그 외 | `NETWORK_ERROR` |

**근거**: 3단계에서 "무엇을 실패로 셌는지"를 밝혀야 하는데(과제 176번 줄), 세분해 두면 나중에 골라 셀 수 있고 뭉치면 못 가른다. 시드 값(`INVALID_CREDENTIALS`)은 그대로 보존된다. → **남은 판단 4번**

**`product_list_view` 마운트 1회 보장**

```ts
const hasTracked = useRef(false);
useEffect(() => {
  if (hasTracked.current) return;
  hasTracked.current = true;
  trackProductListView(filters);
}, [filters]);
```

**근거**: deps를 `[]`로 비우고 `filters`를 읽으면 `exhaustive-deps` 경고가 뜨는데, CLAUDE.md는 "도구 경고(warn 포함)도 무시하지 않는다"고 못박는다. ref 가드를 쓰면 경고 없이 마운트 1회가 보장되고, 프로젝트의 "렌더 중 ref 읽기/쓰기 금지" 규칙에도 걸리지 않는다(effect 안에서만 접근). 시드 실측(필터·정렬·페이지 변경 4,090건 중 직후 `list_view` 0건, 세션당 최대 2건)과도 일치한다.

---

## 5. 교차 검토 — 발견한 문제 4건

### 🔴 1. `initAnalytics()` 위치 근거가 틀렸다

초안은 "`AnalyticsBootstrap`을 트리 최상단 형제로 두면 자식보다 먼저 실행된다"고 했는데 **반대다.** React는 자식 effect를 부모보다 **먼저** 실행한다. 형제 간에는 트리 순서를 따르지만, `{children}` 서브트리의 깊은 자식 effect가 `AnalyticsBootstrap`보다 먼저 돌 수 있다.

**영향**: `ProductListSection`의 `product_list_view`가 `setCommonProperties()` 등록 전에 발화하면 `sessionId`·`ts`·`device`가 **빠진 채** 기록된다. `track()`은 큐에 담기지만 `commonProperties()`는 `track()` 호출 시점에 이미 평가돼 버려 나중에 등록해도 소급되지 않는다.

**수정안**: effect가 아니라 **모듈 로드 시점**에 등록한다.

```ts
// src/analytics/setup.ts — import되는 순간 실행
registerProviders([recordProvider]);
setCommonProperties(() => ({
  sessionId: getOrCreateSessionId(),
  ts: new Date().toISOString(),
  device: getDevice()
}));
```

`events.ts`가 이 모듈을 import하면, 어떤 화면이 이벤트 함수를 부르든 그 전에 등록이 끝나 있다. `initAnalytics()`(프로바이더 초기화·큐 플러시)만 `AnalyticsBootstrap`의 effect에 남긴다 — 큐에 담긴 이벤트는 이미 공통 프로퍼티를 갖고 있으므로 플러시가 늦어도 데이터가 손상되지 않는다.

### 🔴 2. `order_start`가 Suspense 안에서 발화하면 누락된다

`OrderFormSection`은 `useSuspenseQuery(productCatalogQueries.lookup())`을 쓴다. 마운트 = 카탈로그 도착 후다. **카탈로그 요청이 실패하면 `order_start`가 아예 안 찍혀** 그 세션이 주문 퍼널에서 사라지고, 3단계 이탈률 분모가 조용히 깎인다.

**수정안**: `OrderFormPage`(Suspense 바깥)에서 발화한다. `productIds`는 `useCartStore`에서 직접 읽을 수 있어 카탈로그가 필요 없다.

### 🟡 3. `login()`의 반환 타입이 `unknown`이다

```ts
export function login(credentials: LoginCredentials) {
  return apiFetch('/api/auth/login', { ... });   // 제네릭 미지정 → Promise<unknown>
}
```

`login_success`에 `userId`를 넣으려면 응답에서 `user.id`를 꺼내야 하는데 지금 타입으로는 못 꺼낸다(프로젝트가 타입 단언을 금지). `apiFetch<SessionResponse>`로 바꿔야 한다 — **기존 파일 1줄 수정**이 필요하다.

**→ 수정한다** (확정 5번). `SessionResponse`는 이미 `src/entities/auth/index.ts`가 public API로 export하고, `login.ts`는 `_pages` 레이어라 `@/entities/auth` import가 FSD 규칙상 허용된다(확인함).

### 🟡 4. `client_error`를 entities에서 부르면 경계 원칙과 어긋난다

상품 이미지는 `ProductCard`(entities) · `CartSection` · `OrderLine` · `ThumbnailSelect` 4곳에 있다. `ProductCard`에서 직접 `trackClientError()`를 부르면 **린트는 통과하지만**(analytics가 사각지대) entities가 계측을 아는 구조가 된다.

| 안 | 내용 | 대가 |
| --- | --- | --- |
| (a) | `ProductCard`에서 직접 호출 | 짧다. 경계는 문서로만 지킨다 |
| (b) | `ProductCard`에 `onImageError` props를 두고 `ProductCardWithActions`(widgets)가 계측 | 경계 원칙에 맞다. props 1개 추가 |

**범위**도 함께: 4곳 전부인지, 빈도가 압도적인 목록(`ProductCard`, 8,000세션 전부 통과)만인지. ②-4의 근거("상품 이미지 표시가 구매 결정에 영향")는 목록에 가장 강하게 적용된다.

**→ (a) 직접 호출, `ProductCard`만** (확정 2·3번). 근거는 아래 확정 표에 있다.

---

## 6. 확정된 판단 5개 (2026-09-04)

### 1. 2-a 실현 방식 — `recordProvider`를 만든다

**한 번 뒤집힌 결정이라 검토 과정을 남긴다.**

**처음 판단(코드베이스 기준) — 만들지 않는다**

| | 비용 | 이번 주에 산출물을 읽는 코드 |
| --- | --- | --- |
| `recordProvider` | 새 파일 ~15줄 + 버퍼 공존 | **없음** |
| 집계 시 변환 | 0줄 (`map` 한 줄) | — |

3단계 집계는 시드 로그만 쓰고(기간이 안 겹침), 4단계 E2E는 계측 검증을 요구하지 않는다. 소비자 없는 형식을 위해 파일을 늘리는 건 YAGNI 위반이라고 판단했다.

**뒤집은 이유 — 운영 전제가 빠져 있었다**

"이번 주에 읽는 코드가 없다"는 근거는 코드베이스 안만 본 것이다. 운영을 가정하면 30일 뒤 이 로그를 읽는 사람이 반드시 생긴다.

먼저 각 필드가 E2E 판단 기준(빈도·실패비용·재현난이도)에 쓰이는지 확인했다.

| 필드 | 빈도 | 실패 비용 | 재현 난이도 |
| --- | --- | --- | --- |
| `sessionId` | **직접** — 분모이자 그룹 키. 없으면 세션 기준 집계 자체가 불가 | **직접** — "몇 번의 시도가 막혔나" | — |
| `name` | **직접** — 경로 식별 | **직접** — 실패 이벤트 식별(`login_fail`·`client_error`·`session_expired`) | — |
| `ts` | **간접** — 세션 내 이벤트 정렬. 퍼널 순서 판정에 필수 | **간접** — 실패 이후 세션이 끝났는지(이탈) 판정 | — |
| `props` | **간접** — 경로를 화면 단위로 묶을 때(과제 172번) | **직접** — `reason`·`code`가 "무엇을 실패로 셀지"를 가름(176번) | — |
| `device` | **간접** — 기기별 경로 분포 | **간접** — 특정 기기에 실패가 몰리는지 | **간접** — E2E를 어느 뷰포트·브라우저로 돌릴지의 근거 |
| `userId` | — | **간접** — 같은 사용자의 반복 실패·재시도 성공률 | — |

**안 쓰이는 필드는 없다.** 다만 이 표가 1번을 가르지는 않는다 — **두 안 모두 필드를 하나도 잃지 않는다.** 정보량이 같고 중첩 위치만 다르다.

```
recordProvider 있음  { sessionId, ts, name, props: { productId, quantity }, device }
recordProvider 없음  { event, properties: { sessionId, ts, device, productId, quantity } }
```

그래서 실제 논점은 **변환을 보내는 쪽에 둘 것인가, 읽는 쪽에 둘 것인가**였다.

| 변환 위치 | 앱이 늘어나면 | 스키마 책임 |
| --- | --- | --- |
| 보내는 쪽(provider) | 각 앱이 각자 계약을 지킨다 | **생산자** |
| 읽는 쪽(집계) | 집계 스크립트에 앱별 분기가 쌓인다 | 소비자가 떠안음 |

**결정**: 보내는 쪽에 둔다. 합의된 스키마를 지키는 건 생산자 책임이고(과제 146번 줄 "계측 스키마는 혼자 정하는 게 아니라 팀이 합의하는 것"), 2-a 결정("맞춰 기록한다")과도 일치한다. 오버엔지니어링 판정도 다시 보면 — `provider.ts`가 열어둔 확장점을 쓰는 것이지 새 추상화를 만드는 게 아니고, 구현은 구조분해 한 줄이다.

**남은 비용 정리**: 버퍼 2개 공존은 실제 중복이므로 `consoleProvider`를 등록하지 않고 `recordProvider`가 콘솔 출력을 겸한다.

### 2. `client_error` 호출 위치 — `ProductCard`에서 직접 호출

`events.ts`를 거치는 것 자체가 이미 분리다. 과제 147번 줄이 막으려는 건 "계측 상세(이름 문자열·props 스키마)가 화면에 섞이는 것"이지 "특정 레이어가 계측을 아예 몰라야 함"이 아니다. `trackClientError(productId)` 한 줄은 화면 로직과 섞이지 않는다.

props로 올리는 안은 `ProductCard` 사용처 3곳(`HomeSection` · `ProductCardWithActions` · `SavedProductGrid`)에 전부 핸들러를 내려보내야 해서 비용이 더 크다.

**잠재 부채**: 나중에 `src/analytics`를 `FSD_LAYERS`에 등록하면, entities가 analytics를 import하려면 analytics가 `shared`보다 아래여야 한다. 등록 시점에 걸릴 지점이다.

### 3. `client_error` 범위 — `ProductCard`만

②-4의 근거가 "상품 이미지 표시가 **구매 결정**에 영향"인데, 장바구니·주문서는 이미 담기로 정한 뒤라 구매 결정 단계가 아니다. 근거가 정확히 목록·홈을 가리킨다. `ProductCard`에 붙이면 홈·목록·저장목록 3곳이 한 번에 커버된다.

### 4. `login_fail.reason` — 4종 세분화 유지

단일 값으로 두면 500·네트워크 실패가 `INVALID_CREDENTIALS`로 기록되는 **거짓 데이터**가 된다. 코드 차이는 분기 3줄이고, 3단계가 "무엇을 실패로 셌는지" 밝히라고 요구한다(176번 줄).

- 검토한 대안: 3종(400을 `NETWORK_ERROR`에 합침) — 폼이 `required`로 막아 400이 실제로 잘 안 난다. 1줄 절약이라 정확도를 택했다.

### 5. `login()` 타입 수정 — 한다

`apiFetch<SessionResponse>` 단어 하나. 선택지가 아니라 **2-c(`login_success`에 `userId`)의 전제 조건**이다. 지금 `unknown`인 것은 응답을 안 쓰고 있어 드러나지 않은 결함이기도 하다.

---

## 7. 완료조건 확인 (과제 152~154번 줄)

> 로그인부터 주문까지 한 번 통과했을 때 어떤 이벤트가 어떤 순서로 남는지, 문서만 읽고 예측할 수 있다.

위 설계에서 기계적으로 도출한 시퀀스다. 경로는 `03-implementation-notes.md` 7번이 확정한 **"로그인한 뒤 목록에서 담아 주문까지"**를 따른다(이유는 아래 "경로 선택" 절).

| # | 사용자 행동 | 이벤트 | props | 최상위 추가 |
| --- | --- | --- | --- | --- |
| 1 | `/products` 진입 | `product_list_view` | `{ category, sort, page }` | — |
| 2 | 헤더 `로그인` 클릭 → `/login` | `login_start` | `{ from: null }` | — |
| 3 | 로그인 성공 | `login_success` | `{ from: null }` | `userId` |
| 4 | (같은 자리에서 `identify(userId)` 호출 — `track` 이벤트 아님) | | | |
| 5 | `router.replace('/')` → 다시 `/products` | `product_list_view` (2번째) | `{ category, sort, page }` | — |
| 6 | 상품 카드의 담기 클릭 | `cart_add` | `{ productId, quantity: 1 }` | — |
| 7 | 헤더 `장바구니` → `/cart` → `주문하기` → `/orders/new` 도착 | `order_start` | `{ productIds }` | `userId` |
| 8 | 주문하기 클릭 → 201 | `order_complete` | `{ productIds, totalPrice }` | `userId` |

모든 레코드에 공통으로 `sessionId` · `ts` · `device`가 최상위로 붙는다(질문 2 결정).

5번이 시드의 **"세션당 `product_list_view` 최대 2건"** 실측과 맞아떨어진다 — 로그인 왕복 뒤 목록으로 돌아오면 재마운트되어 두 번째가 찍힌다.

### 경로 선택 — 왜 "담기 먼저"가 아닌가

**초안은 "담기 → 미로그인으로 주문서 진입 → 가드 → 로그인 → 복원 → 주문"으로 썼는데 이 경로는 실행되지 않는다.**

장바구니는 메모리 전용 Zustand store이고 `persist`를 붙이지 않기로 확정돼 있다(`03-implementation-notes.md` 7번). 가드 리다이렉트는 문서를 다시 받으므로 장바구니가 비워진다(`02-new-pages-design.md` 9장). 복원된 주문서는 `enteredWithItems === false`가 되어 `OrderFormPage`가 "주문할 상품이 없습니다"로 early return 하고, `order_start` · `order_complete`가 발생하지 않는다.

`03-implementation-notes.md:110`이 이미 이 경로를 정해뒀다 — "**E2E는 장바구니를 UI로 채운 뒤 주문 흐름에 들어간다. 상품 목록에서 담기 → 장바구니 → 주문하기 순서.**" 계측 시퀀스도 같은 경로를 쓴다.

### 3단계로 넘어가는 발견 — 시드의 주 경로를 내 앱이 재현하지 못한다

시드의 `login_start.props.from`은 **100% `cart`**다. 시드 세계에서는 "담기 → 로그인 → 주문"이 주 경로라는 뜻이다.

**내 앱에서는 그 경로가 구조적으로 끊긴다.** 가드 리다이렉트가 장바구니를 비우므로, 그 길로 온 사용자는 빈 주문서를 만난다. 시드 퍼널(`cart_add` 1,309 → `login_start` 644 → `order_start` 419)을 내 앱 로그로는 재현할 수 없다.

3단계 B절에서 이 차이를 근거로 남긴다 — 시드의 이탈률을 내 앱 기준선으로 그대로 쓸 수 없는 이유가 하나 더 생겼다(상세 화면 부재에 이어 두 번째).

### 시퀀스를 적으면서 발견한 설계 구멍 1건

**`login_start.from`에 무엇을 넣을지가 덜 정해져 있었다.** `proxy.ts`는 `next`를 **절대 URL**로 만든다(`01-auth-guard-design.md` 5번 결정: `request.nextUrl.href`). 따라서 `searchParams.get('next')`는 `http://localhost:3000/orders/new`를 돌려준다.

**보완**: `from`에는 **`pathname`만** 넣는다. origin이 로컬·운영에서 달라 그대로 넣으면 같은 화면이 두 값으로 집계된다. `resolveLoginDestination`이 이미 같은 파싱을 하고 있으므로 방식을 맞춘다. `next`가 없는 직접 진입은 `null`.

---

## 8. 교차 검토 잔여 항목 (2026-09-04, 미반영)

2개 에이전트(충돌 검토·누락 검토)가 독립적으로 돌린 결과 21건. 이 중 **1·2번만 위에 반영**했고 아래는 미반영이다. 표시 없는 항목은 한쪽만 지적한 것이고, **[교차]**는 두 리뷰가 독립적으로 같은 지점을 짚은 것이다.

### 높음 — 미반영 4건

| # | 발견 | 걸리는 곳 |
| --- | --- | --- |
| 3 | **`events.ts` 함수 시그니처와 `getOrCreateSessionId()` 위치가 미정.** 04번 2-b가 "질문 3에서 정함"으로 넘긴 숙제를 05번이 받지 않았다. `identify()`·`reset()`을 `events.ts`를 거쳐 부를지도 미정 | 구현 첫 파일에서 멈춤 |
| 4 | **`initAnalytics()` 위치 미확정.** `AnalyticsBootstrap`이 5절에 정의 없이 처음 등장 — 어느 레이어의 어느 파일인지, 어디에 마운트되는지가 없다. 6절 확정 목록에도 5-c 항목이 없다 | 체크리스트 327번 |
| 5 | **매핑 표 부재.** 04번 ①이 "채택/미채택 목록"으로 정의했으나 그 표가 없다. 4절 "시드 대비" 열이 부분적으로 대신하지만 **미채택 항목이 행으로 없어** 목록이 되지 못한다 | 체크리스트 328번, 3단계 A절 |
| 6 | **`product_detail_view`가 05번에 한 번도 등장하지 않는다.** 시드 빈도 2위(4,656건). 미채택 결정과 근거는 04번 ②-1에만 있다 | 과제 143·192번 |

### 중간 — 미반영 6건

| # | 발견 |
| --- | --- |
| 7 | **5절 수정안이 3절 본문에 미반영** — `setup.ts`가 구조도에 없어 3절만 보는 구현자는 만들지 않는다 |
| 8 | **`order_start`의 early return 제약** [교차] — effect를 `if (!enteredWithItems)` **앞**에 둬야 하고(Hooks 규칙), 안에서 가드하지 않으면 빈 장바구니 진입에도 빈 `productIds`로 발화한다. 현재 `OrderFormPage`는 `items.size`만 구독하므로 `items`로 바꿔야 `productIds`를 얻는다. `userId`를 `useQuery`로 읽을지 `getQueryData`로 읽을지도 미정 |
| 9 | **중복 발화 억제가 `product_list_view`에만** [교차] — 같은 "마운트 1회"인 `login_start`·`order_start`에 규칙이 없다. `useEffect`가 CLAUDE.md의 "외부 시스템 동기화 전용" 규칙에 걸리는지에 대한 근거 한 줄도 없다 |
| 10 | **검색(`q`) 계측이 통째로 빠짐** [교차] — `SearchInput`(`onSubmit → setQuery`)이 있는데 채택/미채택 어느 쪽도 언급이 없다. ①의 "빠지는 것은 근거로 남긴다"에 걸린다 |
| 11 | **`product_list_view.props`를 "동일"로 적었으나 값 공간이 다르다** — 내 앱의 `category` 기본값 `'all'`은 시드에 없는 값이다(시드는 5종만). `q` 포함 여부도 미정 |
| 12 | **두 로그 사용 방침 + JSONL 내보내기 경로 부재** — 04번 2-b의 "이번 주 집계는 시드로만"이 05번에 없다. `recordProvider`가 `sessionStorage`에만 쌓아 집계 스크립트에 넣을 통로가 없다. 노이즈 필터링(과제 177번) 재료를 계측이 보태지 못한다는 사실도 미기재 |
| 13 | **장바구니·위시리스트 화면 진입 판정 누락** — 04번 ②-2의 후속 항목("빼기 동작만인지 화면 진입까지인지")이 답 없이 사라졌다 |

### 낮음 — 미반영 6건

| # | 발견 |
| --- | --- |
| 14 | **`ProductCard`에 `'use client'`가 없다.** `onError`를 붙이는 순간 서버 컴포넌트에서 렌더할 수 없게 된다 — 문서가 이 성격 변화를 적지 않았다. 6절 2번이 인정한 "entities가 계측을 안다" 부채와 별개 항목 |
| 15 | **`page_change` 위치가 실제 구조와 어긋난다** [교차] — `ProductResults`는 `onPageChange`를 props로 받기만 하고 부모가 `setPage`를 그대로 넘긴다. 부모에 `handlePageChange` 래퍼가 필요하다. 덤으로 `handleCategoryChange`·`handleSortChange`는 타입 가드 **안쪽**에 계측을 넣어야 값 없는 발화가 안 생긴다 |
| 16 | **`login_fail` 수정 범위가 "1줄"보다 넓다** — `LoginForm.tsx:27`이 `catch {`라 `catch (error)`로 바꿔야 reason 분기가 가능하다 |
| 17 | **`next/image` 사용처 개수가 04번(5곳)과 05번(4곳)에서 다르다** — `HeroSection`을 뺀 이유(상품 이미지가 아님)가 미기재 |
| 18 | **서버에서 `track()`을 부르지 않는다는 제약**을 한 줄 남길 것 — 서버 컴포넌트에서 부르면 큐에 쌓이다 100건에서 버려진다 |
| 19 | **완료조건을 실행으로 확인할 수단이 없다** — 7절 표와 실제 로그를 대조하는 절차가 없다. `src/analytics/logger.test.ts`가 이미 있어 붙일 자리는 존재한다 |

### 검토 결과 문제없음으로 확인된 것

- **`setup.ts`의 SSR 안전성** — `setCommonProperties()`는 콜백만 저장하고(`logger.ts:30-32`) `track()` 시점에 평가되므로(`logger.ts:61`) 서버에서 `sessionStorage`에 닿지 않는다
- **`useRef` 가드가 `exhaustive-deps`를 없앤다** — deps에 `filters`가 있어 규칙이 발동하지 않고, StrictMode 재마운트에서도 같은 인스턴스의 ref는 보존된다
- **`recordProvider`가 과제 63번·체크리스트 330번에 안전하다** — `provider.ts:22-31`이 확장점을 명시했고 `logger.ts`를 손대지 않는다. `consoleProvider` 미등록도 과제 148번이 등록 의무를 부과하지 않는다
- **05번의 코드 실측 주장 14건이 전부 현재 코드와 일치** — `commonProperties` 즉시 평가, 큐 `shift()`, `login()` 반환 `unknown`, `proxy.ts`의 절대 URL 생성, `src/analytics`가 `FSD_LAYERS`에 없음 등
- **5절 1번의 React effect 실행 순서 지적이 맞다** — 자식 effect가 부모보다 먼저 실행되므로 모듈 로드 시점 등록으로 옮긴 방향이 옳다
