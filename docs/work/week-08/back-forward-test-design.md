# week-08 1단계 고민 — "뒤로·앞으로 가기로 필터 복원"을 통합으로 내린 근거

1단계 표의 방법론 칸을 채우면서 나온 고민을 기록한다. 표 자체와 최종 결정은 `docs/rfc/week08-test-plan.md`에 남긴다.

## 배경

이 항목(🚨 뒤로가기 후 화면 필터와 URL 불일치)은 처음엔 E2E로 판단했다. 근거는 "jsdom이 실제 브라우저 히스토리 back/forward, 실제 페이지 리로드를 재현할 수 있나?"라는 질문에 확실한 답이 없었기 때문이다. 8·9·10·11번이 쓰는 `withNuqsTestingAdapter`(nuqs의 테스트 전용 어댑터)를 검토한 결과, 이 어댑터는 **컴포넌트 → URL 쓰기 방향**(`onUrlUpdate` 콜백)만 지원하고, 13번이 필요로 하는 **URL → 컴포넌트 읽기 방향**(외부에서 URL이 바뀌었을 때 컴포넌트가 그걸 읽어 필터를 복원하는 것)은 지원 범위 밖이라 E2E로 확정했다.

이후 다른 세션에서 대안 어댑터(`nuqs/adapters/react`)로 재현 가능하다는 리서치를 제시했고, 핵심 코드를 직접 읽어 검증한 뒤 결론을 통합으로 뒤집었다.

## 검증한 것 — 소스 직접 확인

### 1. `withNuqsTestingAdapter`가 안 되는 이유

`node_modules/nuqs/dist/adapters/testing.js`:

```js
const updateUrl = useCallback((search, options) => {
  const queryString = renderQueryString(search);
  const searchParams = new URLSearchParams(search);
  if (hasMemory) {
    setSearchParams(searchParams);
    locationSearchRef.current = queryString;
  }
  onUrlUpdate?.({ searchParams, queryString, options });
}, [onUrlUpdate, hasMemory]);
```

`updateUrl`이 React `useState`/`useRef`에만 쓰고 `onUrlUpdate` 콜백을 호출할 뿐, `history`·`location`을 전혀 건드리지 않는다. `popstate` 구독도 없다. 세션 히스토리 자체가 없으니 `history.back()`이 이 어댑터에는 아무 영향을 못 준다.

### 2. `nuqs/adapters/react`가 되는 이유

`node_modules/nuqs/dist/adapters/react.js`:

```js
function generateUpdateUrlFn(fullPageNavigationOnShallowFalseUpdates) {
  return function updateUrl(search, options) {
    const url = new URL(location.href);
    url.search = renderQueryString(search);
    (options.history === "push" ? history.pushState : history.replaceState)
      .call(history, history.state, historyUpdateMarker, url);
    emitter.emit("update", search);
  };
}
function subscribe(onStoreChange) {
  emitter.on("update", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => { /* ... */ };
}
```

테스트용 분기 없이 전역 DOM API만 쓴다 — 쓰기는 `history.pushState`/`replaceState`, 읽기는 `useSyncExternalStore` + `location.search`, 구독은 `window.addEventListener('popstate', ...)`. 즉 운영 코드와 같은 경로다.

### 3. jsdom이 이 경로를 실제로 구현한다

`node_modules/.pnpm/jsdom@30.0.1/.../History-impl.js`:

- `back()`/`forward()` → `go(delta)` → `this._window._sessionHistory.traverseByDelta(delta)`
- `pushState` → `removeAllEntriesAfterCurrentEntry()` 호출 후 새 엔트리 추가 — **뒤로 간 상태에서 새 조작을 하면 앞으로 갈 기록이 사라지는 브라우저 규칙**까지 스펙대로 구현돼 있다

모킹이 아니라 whatwg-html 스펙을 따르는 실제 구현체이고, `nuqs/adapters/react` 입장에서는 운영과 같은 코드 경로를 그대로 탄다.

### 4. 전제 확인 — `useProductListFilters.ts`

- `:21` `useQueryStates(productListParsers, { history: 'push', ... })` — category/sort/q 변경 시 엔트리가 실제로 쌓인다
- `:28` `correctPage`만 `{ history: 'replace' }` — 뒤로가기 대상이 아니므로 시나리오는 category/sort 변경으로 잡아야 한다(페이지 보정으로 잡으면 안 됨)

## 14번(새로고침)과의 경계

14번은 `location.reload()`가 필요한데, jsdom은 이를 구현하지 않는다(호출 시 `notImplemented` 경고 후 no-op). E2E 유지가 맞다. 13번이 통합으로 내려가는 이유는 "같은 document 안에서 URL만 바뀌는 동작"이라 새 document를 만드는 새로고침과는 성격이 다르기 때문이다.

## 결정

**통합.** `nuqs/adapters/react`로 교체해 jsdom의 실제 History 구현 위에서 재현한다. `withNuqsTestingAdapter`는 이 항목엔 못 쓴다(8~11번 전용).

- 단위 X: 뒤로가기 후 select·검색창 표시값이 URL과 맞는지 화면에서 확인해야 해서 렌더 필요
- 통합 가능 근거: 위 1~4

## 구현 시 주의점 (2단계용 메모)

1. **throttle 50ms** — nuqs 기본 throttle이 jsdom 환경에서 50ms로 잡힌다(`window.GestureEvent` 부재 시 `getDefaultThrottle`이 50 반환). 연속 클릭이 이보다 빠르면 하나의 `pushState`로 합쳐져 엔트리가 안 쌓인다. 연속 조작 시나리오면 클릭 사이에 유예 시간을 둬야 하고, 뒤로가기 1회만 검증하면 불필요.
2. **`window` 공유로 인한 테스트 간 누수** — jsdom `window`는 테스트 파일 단위로 공유돼 `location`과 히스토리 스택이 다음 테스트로 넘어간다. `beforeEach`에서 `window.history.replaceState(null, '', '/products')`로 초기화해야 한다. `replaceState`는 스택 자체를 안 비우므로, 이 항목은 별도 파일로 분리하는 걸 권장한다.
3. **비동기 traversal** — jsdom의 history traversal은 `setTimeout(0)` 2단 중첩으로 처리돼 동기 assert가 안 된다. `waitFor` 필수.

## 별개로 발견한 사이드이펙트 — `vitest.setup.ts`에 RTL `cleanup()` 없음

13번 조사 중 실측 과정에서 드러난, 13번과 무관하지만 **모든 통합 테스트에 영향을 주는** 설정 갭이다.

- **증상**: `vitest.config.ts`에 `globals: true`가 없고 `vitest.setup.ts`에도 `cleanup()` 호출이 없어 Testing Library 자동 cleanup이 등록되지 않는다. 여러 통합 테스트가 쌓이면 이전 테스트가 렌더한 DOM이 안 지워진 채 남아 `Found multiple elements with the role status` 같은 오탐이 난다.
- **왜 지금까지 안 드러났나**: 통합 테스트가 0개였어서 증상이 발현될 조건 자체가 없었다.
- **조치 계획(미반영)**: `vitest.setup.ts`는 아직 고치지 않았다. 13번을 포함해 통합 테스트를 실제로 작성하기 시작할 때 다음을 추가한다.

  ```ts
  import { cleanup } from '@testing-library/react';
  // ...
  afterEach(cleanup);
  ```
