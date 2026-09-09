# 5주차 상태 설계 의사결정 기록 — 서버 상태 설계

> 대상: 홈/상품 목록 서버 상태의 캐시 정책 및 query key 설계
> 배경: [state-design.md](./state-design.md) 1번 항목("홈·상품 목록 데이터")에서 보류했던 결정들을 별도 문서로 분리.

## 1. 캐시 정책 수치

### 전역 default staleTime

- 결정: 20s
- 근거:
  - SSR 렌더링 시 중복 쿼리 요청 방지
  - API 요청 절약 (단, 실시간 갱신이 필요한 데이터는 개별적으로 주의해서 세팅)
  - TanStack Query default staleTime은 0이므로, 이를 20s로 늘려 기본을 절약형으로 두고 실시간 갱신이 중요한 쿼리만 0으로 개별 오버라이드하는 방향으로 설계

### 홈 query staleTime

- 결정: 전역 default(20s) 상속
- 근거: 개인화 추천 데이터. 유저의 관심 상품에 따라 목록이 실시간 업데이트될 수 있음을 고려

### 목록 query staleTime

- 결정: 전역 default(20s) 상속
- 근거:
  - `products/page.tsx`에서 `prefetchQuery` → `dehydrate` → `HydrationBoundary`로 SSR 프리페치를 쓴다. staleTime을 0으로 두면 hydrate된 쿼리가 mount 시 `refetchOnMount`(기본 true) 조건에 걸려 즉시 background refetch가 발생해(TanStack Query 공식 SSR/Hydration 가이드), 서버가 렌더 직전 받아온 데이터를 클라이언트가 곧장 한 번 더 요청하는 중복 요청이 트래픽 많은 페이지에서 매 페이지뷰마다 발생한다. 20s 상속은 이를 방지한다.
  - 담기/주문 시점의 가격·재고 정합성은 staleTime이 아니라 서버 재검증 계약의 몫(범위 밖, 후속)이므로, staleTime을 짧게 잡아 정합성을 보장하려 할 필요가 없다.

### gcTime

- 결정: 기본값 5분 유지
- 근거:
  - 홈·목록 모두 유저가 다시 돌아올 가능성이 있는 화면이라 gcTime을 늘리는 방향도 검토
  - 목록에 대해 10분으로 늘리는 안을 고민했으나, 필터·정렬·페이지 조합이 많이 쌓일 경우 메모리 점유가 커질 수 있어 보류
  - 중간 합의점으로 기본값 5분 유지

## 2. Query Key 설계

> 참조: https://velog.io/@ubin_ing/react-query-options-basement-pattern

### query key 팩토리 구조

- 결정: 도메인별로 query key와 query option을 구조화한 팩토리 객체를 둔다 (`productQueries`, `homeQueries` 등).
- 근거: 도메인에 대한 캐시 정책을 한 곳에서 중앙집중식으로 관리할 수 있어, 일관된 캐시 정책과 쿼리 간 응집성이 확보됨.
- 코드 예시:

```ts
// productQueries.ts
const productQueries = {
  all: () => ['product'],
  list: (): UseQueryOptions<Product[]> =>
    queryOptions({
      queryKey: [...productQueries.all(), 'list'],
      queryFn: getProductList
    })
};

// homeQueries.ts
const homeQueries = {
  all: () => ['home'],
  detail: (id: string): UseQueryOptions<HomeDetail> =>
    queryOptions({
      queryKey: [...homeQueries.all(), id],
      queryFn: () => getHomeDetail(id)
    })
};
```

### product list 필터 query key 설계

- 결정: 필터를 객체 형태로 query key에 포함하되, 정규화(normalize)를 거쳐 넣는다. 정규화 시 실제로 param 전달이 필요한 필드를 정확히 분석하고, 필요한 경우에만 도메인 순수 함수로 정규화 로직을 추가한다. 필요 없으면 추가하지 않는다.
- 근거:
  - 상품 목록 데이터는 필터링 상태에 의존해 재요청되어야 하는 값이므로, 필터가 query key에 반영되어야 함
  - 필터링 동작으로 쌓인 히스토리(뒤로가기 등)가 페이지에 적용될 때, 이미 받아온 데이터가 있으면 새로 로드하지 않고 그 데이터를 그대로 보여줘야 함

#### 요청 가능한 필터 필드 전수

`src/app/api/products/route.ts`가 실제로 읽는 파라미터는 6개뿐이다: `q`, `category`, `sort`, `page`, `pageSize`, `scenario`. 그 외 파라미터는 무시된다(400이 되지 않는다).

`scenario`는 mock API 검증 전용 제어값으로, 발제 계약상 URL 상태와 `ProductListQuery`에 넣지 않는다(`docs/assignments/week-05.md:116`). 따라서 **query key에도 넣지 않는다.**

`src/types/commerce.ts`의 계약:

```ts
export type ProductListQuery = {
  q?: string;
  category?: CategoryId | 'all';
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};
```

`pageSize`는 URL 상태로 관리하지 않는다(발제는 nuqs 관리 대상을 검색·카테고리·정렬·페이지 4가지로 한정). 값이 변하지 않으므로 캐시를 분기시키지 않는다 → 모듈 상수로 두고 요청 파라미터에만 포함한다.

#### 정규화가 불필요한 대상 — 도구가 이미 보장

| 대상                        | 불필요한 이유                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 객체 필드 순서              | `hashKey`가 `Object.keys(val).sort()`로 정렬한 뒤 직렬화한다(`@tanstack/query-core@5.101.2`, `build/modern/utils.js:85-93`) → `{q, category}`와 `{category, q}`는 동일 해시                      |
| optional 필드의 `undefined` | `JSON.stringify`가 값이 `undefined`인 프로퍼티를 버린다 → `{q:'', pageSize: undefined}`와 `{q:''}`는 동일 해시. 필드를 제거하는 정규화가 필요 없다                                               |
| `category`                  | `parseAsStringLiteral(CATEGORY_IDS).withDefault('all')`이 허용값 외 입력을 기본값으로 되돌린다 → 표현 변형이 parser 밖으로 새어나가지 않는다. 값 생략과 `?category=all`도 동일하게 `'all'`       |
| `sort`                      | 위와 동일(`parseAsStringLiteral(SORTS).withDefault('latest')`). 발제가 기본 정렬도 `sort=latest`를 명시해 보내도록 요구하므로, 서버의 "sort 생략 시 fixture 순서 유지" 경로는 애초에 타지 않는다 |

즉 **"객체 + 정규화" 중 객체 부분은 그 자체로 안전**하며, 정규화는 전 필드 일괄 적용이 아니라 아래 두 필드에만 필요하다.

#### 정규화가 필요한 대상 — parser가 막지 못하는 표현 변형

**`q` — 앞뒤 공백 제거 + ko 로케일 소문자화**

`parseAsString.withDefault('')`는 문자열을 그대로 통과시킨다. 반면 서버는 받는 즉시 정규화한다:

```ts
// src/app/api/products/route.ts
const q = params.get('q')?.trim().toLocaleLowerCase('ko') ?? '';
```

→ `?q=%20나이키`, `?q=나이키%20`, `?q=나이키`는 **서버 응답이 완전히 동일한데 query key만 3개로 갈라진다.** 대소문자도 마찬가지다(`?q=NIKE` vs `?q=nike`). URL 직접 편집·링크 공유·복사 붙여넣기로 실제 발생하는 경로다.

⚠️ **내부 공백은 건드리지 않는다.** 서버 매칭은 `` `${brand} ${name}` ``에 대한 `includes(q)`이므로 `나이키  운동화`(공백 2개)는 `나이키 운동화`와 **다른 검색 결과**를 낸다. 내부 공백 축약은 정규화가 아니라 동작 변경이 된다.

**`page` — 1 이상 정수로 보정**

`parseAsInteger`는 `0`·`-1`도 유효한 정수로 통과시킨다. 그대로 요청하면 서버 검증(`/^[1-9]\d*$/`)에 걸려 **400**이 되고, 그 400 응답조차 값마다 다른 key로 캐시된다. 발제의 완료 기준("지원하지 않는 값이 들어와도 parser의 기본값과 API 계약을 벗어나지 않는다")을 위반한다.

→ `page < 1`이면 `1`로 보정한다. `?page=0`·`?page=-1`·`?page=1`이 하나의 key로 합쳐지는 부수 효과도 얻는다.

#### 정규화와 캐시 최적화의 관계 (앞선 미해결 질문에 대한 답)

**달성할 수 있다. 단 캐시 최적화는 부수 효과이고, 정규화의 1차 목적은 요청 유효성 보장이다.**

- `q` 정규화: 서버가 이미 수행하는 정규화를 클라이언트에서 선행 → 같은 검색은 반드시 같은 key
- `page` 보정: 400을 유발하는 값이 애초에 요청과 key에 도달하지 않음
- `category`·`sort`·필드 순서·`undefined`: parser와 `hashKey`가 이미 보장하므로 **추가 정규화 코드를 만들지 않는다** (필요 없으면 굳이 추가하지 않는다는 위 결정에 부합)

"필터링 히스토리를 뒤로/앞으로 이동으로 재적용할 때 새로 로드하지 않고 이미 받아온 데이터를 보여준다"는 요구는 **정규화된 안정적 key + 목록 staleTime(전역 20s 상속)**의 조합으로 충족된다. 같은 조건으로 돌아오면 동일 key가 재현되고, 20s 안이면 fresh 상태라 재요청도 로딩 상태 노출도 없다.

#### 정규화 설계

URL 값 자체는 건드리지 않고, **URL → 요청 파라미터 변환 지점에 순수 함수 하나**만 둔다. URL은 사용자가 입력한 원본 표현을 유지하고(검색창 표시값도 그대로), 정규화 결과는 요청과 query key에만 쓴다.

```ts
// 상품 도메인의 순수 함수
export const PRODUCT_PAGE_SIZE = 12;

export function toProductListQuery(filters: { q: string; category: CategoryId | 'all'; sort: ProductSort; page: number }): ProductListQuery {
  return {
    q: filters.q.trim().toLocaleLowerCase('ko'), // 서버와 동일 규칙. 내부 공백은 유지
    category: filters.category, // parser가 보장 — 추가 처리 없음
    sort: filters.sort, // parser가 보장 — 추가 처리 없음
    page: Math.max(1, filters.page),
    pageSize: PRODUCT_PAGE_SIZE
  };
}
```

query key는 이 함수의 반환값을 그대로 싣는다. **key와 실제 요청 파라미터가 같은 출처에서 나오므로 둘이 어긋날 수 없다.**

```ts
const productQueries = {
  all: () => ['product'],
  list: (filters: ProductListFilters) => {
    const query = toProductListQuery(filters);
    return queryOptions({
      queryKey: [...productQueries.all(), 'list', query],
      queryFn: () => getProductList(query),
      staleTime: 5 * 60 * 1000
    });
  }
};
```

검증용으로 순수 함수 테스트 1개를 남긴다 — 공백·대소문자 변형이 같은 결과로 수렴하는지, 내부 공백은 보존되는지, `page=0`이 `1`로 보정되는지.

### retry 정책

- 결정: 기본 `retry`(3회, exponential backoff) 대신, 에러 유형에 따라 재시도 여부를 분기하는 함수를 `productQueries.list`에 설정한다. `ApiError.status`가 500 이상(일시적 서버 오류로 간주)일 때만 재시도하고, 4xx(요청 자체가 잘못됨)는 즉시 실패 처리한다.
- 근거:
  - TanStack Query 기본값은 실패 원인을 구분하지 않고 3회 재시도한다(공식 문서 `important-defaults.md`: "Queries that fail are silently retried 3 times with exponential backoff delay before capturing and displaying an error to the UI"). `page` 음수처럼 서버 검증에서 걸려 400이 되는 요청은 재시도해도 같은 응답이 반복될 뿐이라, exponential backoff만큼 사용자가 무의미하게 기다리게 된다.
  - `apiFetch`가 던지는 `ApiError`(3번 항목)는 상태 코드를 들고 있으므로, 에러 객체만으로 "재시도할 가치가 있는 실패(5xx·네트워크)"와 "재시도해도 똑같이 실패하는 요청(4xx)"을 구분할 수 있다.
  - 재시도가 진행되는 동안 query `status`는 `'pending'`을 유지하고, 재시도가 모두 소진된 뒤에야 `'error'`로 전환된다. Suspense는 `status === 'pending'`일 때만 fallback을 그리고, `throwOnError` 기본값도 `status === 'error'`가 된 이후에만 평가되므로 재시도 중에는 로딩 스켈레톤만 보이고 에러 fallback은 노출되지 않는다(4번 항목 에러 처리 구조와 연결). 이 `retry` 정책은 "언제 최종 실패로 확정할지"를 에러 유형별로 앞당기거나 유지하는 것일 뿐, 그 기본 동작 자체를 바꾸지 않는다.
- 코드 예시 (위 `productQueries.list`에 `retry` 추가):

```ts
const productQueries = {
  all: () => ['product'],
  list: (filters: ProductListFilters) => {
    const query = toProductListQuery(filters);
    return queryOptions({
      queryKey: [...productQueries.all(), 'list', query],
      queryFn: () => getProductList(query),
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => failureCount < 3 && !(error instanceof ApiError && error.status < 500)
    });
  }
};
```

## 3. API 함수 계층

### API 함수·queryOptions 팩토리의 위치

- 결정: `src/app/api/{domain}/` 아래, 관련 도메인 디렉토리 하위에 둔다 (예: `src/app/api/products/`).
- 근거: 컴포넌트 로직을 포함하지 않는 API의 쿼리 정의이므로, 컴포넌트 트리가 아니라 API 계층에 귀속된다.
- 주의: `src/app/api/{domain}/`는 Next.js App Router가 `route.ts`를 Route Handler(서버)로 특별 취급하는 예약 디렉토리다. `route.ts`가 아닌 파일은 라우팅에서 무시되므로 같은 폴더에 클라이언트용 `queryOptions` 팩토리를 둬도 라우팅 동작은 깨지지 않지만, 서버 핸들러 코드와 클라이언트 쿼리 정의가 같은 폴더 트리에 공존하게 된다. 이 트레이드오프를 인지한 채로 내린 결정.

### 공통 fetch wrapper

- 결정: 도메인 API 함수가 공유하는 fetch wrapper 하나를 둔다. 응답이 2XX가 아니면 에러로 처리하고, 상태 코드와 메시지를 담은 커스텀 에러 클래스(`ApiError`)를 throw한다. wrapper는 도메인 폴더가 아니라 API 계층 직속 하위(`src/app/api/apiFetch.ts`)에 둔다.
- 근거:
  - `fetch`는 400·500을 받아도 reject하지 않고 정상 resolve한다(네트워크 자체가 끊기는 경우만 reject) → `!res.ok`를 명시적으로 확인해 throw하지 않으면 에러 응답 바디가 정상 데이터인 것처럼 통과해 `isError`가 true로 바뀌지 않고, `state-design.md` 6번 항목에서 결정한 "에러는 ErrorBoundary가 처리"가 성립하지 않는다.
  - 상태 코드만 담은 `Error(message)`로는 실패 유형을 구분할 수 없다. 상태 코드를 커스텀 에러 클래스에 담아두면 `retry` 옵션에서 "4xx는 재시도하지 않는다" 같은 분기를 에러 객체만으로 판단할 수 있다.
  - wrapper는 특정 도메인 소유가 아니라 모든 도메인 API 함수가 공유하는 인프라 코드다. 도메인 폴더(`products/`, `home/`) 중 하나에 두면 다른 도메인이 그 폴더를 가로질러 import해야 해 계층이 어색해진다. API 계층 직속 하위에 두어 모든 도메인이 동등하게 참조하게 한다.
- 코드 예시:

```ts
// src/app/api/apiFetch.ts
// AI 생성
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const message = await res
      .json()
      .then((body: ApiErrorResponse) => body.message)
      .catch(() => '요청을 처리하지 못했습니다.');
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}
```

각 도메인 API 함수는 URL과 타입만 넘긴다. 상태 코드 확인은 wrapper에 위임한다.

```ts
// src/app/api/products/getProductList.ts
function getProductList(query: ProductListQuery): Promise<ProductListResponse> {
  return apiFetch(`/api/products?${toSearchParams(query)}`);
}
```

## 4. 로딩·에러 처리 — 상품 목록

### 로딩: `useSuspenseQuery` + `startTransition`

- 결정: `useQuery` + `placeholderData: keepPreviousData` 대신, `useSuspenseQuery` + `startTransition` 조합을 채택한다.
- 근거:
  - 초기 진입 로딩은 Suspense 경계의 스켈레톤으로 선언적으로 처리한다 — 컴포넌트가 `isPending`을 직접 분기하지 않는다.
  - 필터/페이지가 바뀌면 "이전 목록을 유지한 채 전환"해야 한다. `useSuspenseQuery`는 캐시에 없는 새 query key로 바뀌면 `shouldSuspend`(= `result.isPending`, 해당 key의 status가 `pending`일 때만 참) 조건에 걸려 즉시 Suspense fallback을 그린다. 이 전환을 `startTransition`으로 감싸면 React는 새 렌더링이 끝날(성공하거나 실패할) 때까지 이전에 커밋된 트리를 그대로 유지하고, 트랜지션의 `isPending`만 노출한다.
  - `placeholderData: keepPreviousData`는 `useQuery` 전용 경로로, placeholder 데이터를 주입하는 다른 메커니즘이라 `useSuspenseQuery`와 병행하지 않는다 — 의도적으로 배제.
- 코드 예시:

```tsx
function ProductListSection({ filters }: { filters: ProductListFilters }) {
  const [isPending, startTransition] = useTransition();
  const { data } = useSuspenseQuery(productQueries.list(filters));

  function handleFilterChange(next: ProductListFilters) {
    startTransition(() => setFilters(next)); // URL 상태(nuqs) 갱신을 트랜지션으로 감쌈
  }

  return (
    <section aria-busy={isPending}>
      <ProductListFilterBar onChange={handleFilterChange} />
      <ProductGrid products={data.products} />
      <ProductPagination totalCount={data.totalCount} page={filters.page} />
    </section>
  );
}
```

### 페이지네이션: `useInfiniteQuery` 의도적 배제

- 결정: 무한 스크롤(`useInfiniteQuery`) 대신 offset 기반 페이지네이션(`page`/`pageSize`)을 유지한다.
- 근거: `week-05-quests.md` 1단계 API 계약이 `page`(1부터 시작)/`pageSize`만 정의하고, 과제 어디에도 무한 스크롤 요구가 없다. "이전 목록 유지"는 페이지네이션 컨트롤 + `startTransition` 조합만으로 충족되므로 무한 스크롤 전용 훅을 도입할 이유가 없다.

### Suspense 경계 범위: 서브트리 전체 fallback 허용

- 결정: 필터 바 + 상품 그리드 + 페이지네이션을 하나의 Suspense 경계로 묶는다. 이 서브트리 내부에 별도의 부분 로딩 영역을 두지 않는다.
- 근거:
  - `week-05-quests.md` 완료조건은 "요청 중·요청 실패·검색 결과 없음이 같은 화면으로 처리되지 않는다"만 요구할 뿐, 목록 섹션 내부의 부분 로딩(예: 필터 UI는 그대로 두고 그리드만 스켈레톤)까지는 요구하지 않는다.
  - `state-design.md` §6의 "홈·목록을 섹션별로 Suspense·ErrorBoundary 분리" 결정과 정합적이다 — 상품 목록 자체가 이미 하나의 섹션 단위이므로, 그 안을 다시 쪼개는 것은 요구사항을 넘어서는 설계다.
  - Suspense의 구조적 단점(경계 하위 트리 전체가 fallback으로 대체됨)을 그대로 수용한다. 대가로 얻는 단순함: 컴포넌트가 로딩 상태를 직접 분기하지 않는다.
- 경계 밖: 네비게이션 바. 필터/페이지 전환 중에도 사용자가 다른 화면으로 이동할 수 있어야 하므로, Suspense 경계는 목록 섹션에만 두고 네비게이션 바는 상위 레이아웃에 남긴다.

### 에러 처리 구조: `react-error-boundary` + `QueryErrorResetBoundary`

- 결정: `react-error-boundary`(신규 의존성 — 아래 고지 참조)를 도입한다. `QueryErrorResetBoundary`로 목록 섹션을 감싸고, `onReset` prop에 `reset`을 연결한다 — `resetErrorBoundary()`가 호출되면 쿼리 캐시의 에러 상태 초기화와 React 트리 재마운트가 함께 일어난다.
- 범위 변경 고지: `state-design.md` §6은 재시도(refetch) UI를 "Basic 범위 밖(Advanced C)"으로 규정했었다. 이번 결정으로 Basic 설계에 재시도 배선을 포함시킨다 — 에러 fallback이 메시지만 있는 막다른 화면이 아니라 즉시 재요청 가능한 화면이어야 한다는 판단. `state-design.md` §6도 함께 갱신했다(아래 참조).
- 에러 전파 범위: `useSuspenseQuery`는 `throwOnError` 옵션을 지원하지 않는다(TanStack Query 공식 문서 — `useSuspenseQuery`는 `throwOnError`·`enabled`·`placeholderData`를 옵션에서 제외한다). 대신 기본 동작을 그대로 쓴다 — 기본 `throwOnError`는 `query.state.data === undefined`일 때만 throw하므로, **신규 페이지/필터(캐시에 없던 key)의 실패는 자동으로 ErrorBoundary까지 전파**되고, **이미 캐시된 페이지의 백그라운드 재검증 실패는 조용히 무시되며 이전 데이터가 그대로 유지**된다. 후자까지 항상 fallback으로 전환하려면 `if (error && !isFetching) throw error` 형태의 수동 오버라이드가 필요하지만, 이번 설계에서는 채택하지 않는다 — 사용자가 "신규 페이지/필터만"을 기본 범위로 확정했다.
- 경계 배치: `ErrorBoundary`도 네비게이션 바를 감싸지 않는다(Suspense 경계와 동일한 이유).
- 코드 예시:

```tsx
function ProductListPage() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div role="alert">
              <p>{error.message}</p>
              <button onClick={resetErrorBoundary}>다시 시도</button>
            </div>
          )}
        >
          <Suspense fallback={<ProductListSkeleton />}>
            <ProductListSection />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

- 신규 의존성 고지: `react-error-boundary`는 현재 `package.json`에 없다. CLAUDE.md "의존성은 임의로 추가/업그레이드하지 않는다. 필요 시 먼저 제안한다" 규칙에 따라, 이 문서의 결정이 곧 그 제안이다 — 실제 설치는 구현 단계에서 진행한다.

### CLAUDE.md 보완 — 클래스 컴포넌트 금지 예외

- 결정: `### 컴포넌트 구조`의 "클래스 컴포넌트 금지" 항목에 에러 바운더리 예외를 명시했다(CLAUDE.md 직접 수정).
- 근거: React 공식 문서(react.dev/reference/react/Component)는 "`static getDerivedStateFromError`에는 함수 컴포넌트용 직접적인 대응 API가 아직 없다"고 명시한다. `react-error-boundary`의 `ErrorBoundary`도 내부적으로 이 제약 때문에 클래스 컴포넌트로 구현돼 있다 — 회피 불가능한 구조적 제약이므로, 기존 "클래스 컴포넌트 금지"와 "에러는 ErrorBoundary로 처리한다"(같은 문서 47번째 줄) 사이의 문자적 충돌을 예외 조항으로 해소한다.

## state-design.md 갱신 필요 사항

- 1번 항목 "미해결 / 보류"의 "홈·목록 staleTime 구체 숫자와 근거", "gcTime 판단 기준" 두 항목은 이 문서로 해결되었으므로 체크 처리 필요.
- §6 "범위 밖(YAGNI)"의 "재시도(refetch) UI" 항목 — 위 4번 항목에서 Basic으로 채택했으므로 갱신 완료(아래 참조).
