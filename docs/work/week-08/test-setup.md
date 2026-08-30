# week-08 0단계 — 테스트 환경과 모킹 경계

이 문서는 0단계(테스트 환경 구축)에서 내린 의사결정과 산출물을 기록한다. 1단계 이후 항목은 과제가 지정한 경로인 `docs/rfc/week08-test-plan.md`에 남긴다.

## 1. 사전 환경 세팅 — 과제 문서와 이 레포의 차이

이 레포는 6주차 FSD 전환과 7주차 성능 작업을 거치면서 두 지점이 달라졌다. 0단계 설정에 직접 영향을 주므로 착수 전에 정리한다.

### 1-1. 응답 계약 위치 — 현 FSD 구조를 유지한다

과제 문서가 가리키는 `src/types/commerce.ts`는 이 레포에 없다. 6주차 FSD 전환으로 계약 타입이 `@/entities/product/model/types.ts`, `src/_pages/home/api/getHome.ts`, `src/shared/api/apiFetch.ts`로 나뉘어 옮겨갔다.

**결정**: 되돌리지 않는다. 계약 타입을 한곳으로 다시 모으면 `eslint-plugin-boundaries`가 강제하는 레이어 규칙과 충돌한다.

### 1-2. mock API production 지연 — 500ms로 원복한다

과제 문서는 production 지연 500ms를 전제하는데, 앱이 모든 요청에 `scenario=slow`를 하드코딩해 실제로는 1,500ms였다. 7주차에 지연을 관찰 가능하게 만들려던 의도적 조치였으나, 8주차는 테스트 기준선이 과제와 같아야 하므로 앱 호출부에서 제거한다.

**유지한 것**: 라우트의 `slow` 시나리오 자체는 남겼다. 과제가 `?scenario=empty|error|slow`를 제공 기능으로 명시하므로 명시적 요청 시에는 계속 동작해야 한다. 지운 것은 "앱이 항상 그것을 요청하던" 부분뿐이다.

**남는 불일치**: `docs/work/week-07/`의 측정 기록은 1,500ms 전제로 쓰였다. 그 시점의 측정 이력이므로 수정하지 않는다.

## 2. 설치 패키지

| 패키지                        | 역할                   | 실제 설치 버전 |
| ----------------------------- | ---------------------- | -------------- |
| `@testing-library/react`      | 컴포넌트를 그리고 찾기 | 16.3.2         |
| `@testing-library/user-event` | 클릭·입력 재현         | 14.6.4         |
| `@testing-library/jest-dom`   | DOM matcher            | 7.0.1          |
| `jsdom` / `happy-dom`         | DOM 환경               | jsdom 30.0.1   |
| `msw`                         | 네트워크 요청 가로채기 | 2.15.0         |
| `@playwright/test`            | E2E                    | 1.62.1         |

- `@testing-library/dom`: 세 패키지가 공통으로 요구하는 peer dependency. `package.json`엔 선언하지 않고 pnpm이 격리 스토어에 `10.4.1`로 자동 해석하게 둔다 — 직접 import하지 않고 필요해지면 그때 명시적으로 추가한다.

- `jsdom` / `happy-dom` 중 선택한 것과 이유: **jsdom**. 초기화 속도는 내부 구현이 단순한 happy-dom이 우세하지만, 이번 주에 작성할 테스트의 양과 소요 시간이 미정이라 그 차이가 결정을 가를 만큼인지 알 수 없다. 속도 축에서는 두 선택지가 모두 열려 있다고 보고, 생태계 축으로 갈랐다. jsdom은 채택 규모가 약 8배 크고 2011년부터 조직이 관리하며, 관리자에 WHATWG HTML 명세 편집자가 포함돼 있다. 명세에 가까운 구현일수록 예상과 다른 동작을 만났을 때 원인을 찾기 쉽고 참고 자료도 많아, 테스트 환경을 처음 세우는 이번 단계에 적합하다고 판단했다.

## 3. DOM 환경 분리

- 지금 레포의 5개 기존 테스트는 DOM이 필요 없어 `node` 환경에서 돈다. 컴포넌트 테스트는 DOM이 필요하다. 한 명령(`pnpm test` 또는 `pnpm check`)으로 두 종류가 함께 통과해야 한다.

### 3-1. 검토한 방식

| 방식                                        | 개요                                                     | 채택 여부 | 이유                                                                                                                                                                                                                                                                |
| ------------------------------------------- | -------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest `projects` 분리                      | `vitest.config.ts`에서 파일명 패턴으로 두 그룹을 나눔    | **채택**  | 결정적으로 `--project` 플래그로 그룹을 선택 실행할 수 있다 — 실측: node 13개 + jsdom 5개(임시) 혼합 시 전체 1.64s인데 `--project node`만 돌리면 0.33s(약 5배). watch 모드에서 순수 함수만 빠르게 반복하고, push 전엔 `pnpm check`로 전체를 돌리는 루틴이 가능해진다 |
| 파일 단위 `// @vitest-environment` docblock | 기본 환경은 유지하고 필요한 파일에만 주석으로 오버라이드 | 미채택    | 판별 근거가 주석과 함께 남길 수 있다. 하지만 그룹 단위 선택 실행이 안 된다. 파일 필터링이 어색해 결국 전체를 돌리게 되므로 watch 모드에서도 DOM 비용을 매번 같이 진다. 이 차이가 나머지 축(판별 정확성, 근거 가시성)은 근소한 차이로 미채택했다.                    |
| 전부 DOM 환경 통일                          | 비교 대상(채택 금지)                                     | 미채택    | 과제에서 명시적으로 금지 — DOM 불필요 테스트까지 매번 브라우저 흉내 환경을 세우는 비용이 테스트 수가 늘수록 누적됨. 실측: jsdom 환경 구성 비용은 파일당 약 650ms                                                                                                    |

**파일명 컨벤션**

두 그룹을 파일명으로 구분하는 방식은 `*.unit.test.*` / `*.integration.test.*` 대칭 접미사로 정했다. [Vitest 공식 `projects` 가이드](https://vitest.dev/guide/projects)와 [실무 사례](https://howtotestfrontend.com/resources/vitest-config-projects) 모두 양쪽 그룹에 접미사를 명시하는 방식을 권장한다. 파일명만 보고 의도가 드러나고, `단위`/`통합`이라는 이름이 1단계 표의 방법론 분류(단위·통합·E2E)와도 그대로 대응해 어휘가 하나로 통일된다.

### 3-2. 최종 선택과 근거

- 선택한 방식: **Vitest `projects`**, 파일명은 **`*.unit.test.*` / `*.integration.test.*` 대칭 컨벤션**
- 근거: 두 방식을 비교한 여러 축(판별 정확성·가시성·신규 작성 비용·재분류 비용 등)은 대부분 근소한 차이거나 동률이었다. 유일하게 큰 차이가 난 축은 **그룹별 선택 실행 가능 여부**다. `projects`는 `--project` 플래그로 unit 그룹만 골라 돌릴 수 있어, 로컬 개발 중(watch 모드)엔 순수 함수 위주의 빠른 unit 테스트만 반복하고, 원격에 push하기 전엔 `pnpm check`로 integration 테스트를 포함한 전체를 검증하는 흐름을 만들 수 있다.

- integration 환경(jsdom)으로 도는 파일 목록과 각각의 이유:
  | 파일      | DOM이 필요한 이유                                                                                     |
  | --------- | ----------------------------------------------------------------------------------------------------- |
  | 아직 없음 | 1단계 배치가 확정되면 통합으로 분류된 항목의 컴포넌트 테스트부터 `*.integration.test.tsx`로 작성 예정 |

## 4. 환경 셋업 시간 비교

`vitest run` 출력에서 환경 셋업에 걸린 시간을 비교한다.

| 시나리오                                        | 실행 커맨드                                  | environment | setup | 전체 Duration | 비고                                                                                                      |
| ----------------------------------------------- | -------------------------------------------- | ----------- | ----- | ------------- | --------------------------------------------------------------------------------------------------------- |
| 착수 전 기준선 — 전부 `node`, `setupFiles` 없음 | `pnpm test`                                  | 1ms         | 0ms   | 370ms         | 기존 13파일 68테스트. Node `v24.17.0`                                                                     |
| 전부 `jsdom`으로 통일했을 때(임시 측정, 원복함) | `vitest run --config vitest.probe.config.ts` | 9.15s       | 0ms   | 1.53s         | 같은 13파일 68테스트를 `projects` 없이 `environment: 'jsdom'` 하나로만 실행. 측정 후 임시 config **삭제** |
| 분리 적용 후(실제 구성)                         | `pnpm test`                                  | 1ms         | 0ms   | 496ms         | unit 13파일 68테스트(integration 그룹은 0파일). `--project unit` 단독 실행도 동일하게 통과 확인           |

- 비교 코멘트: `environment`가 1ms → 9.15s로 뛰었다.

  jsdom은 파일마다 `window`·`document`·전역 DOM API 트리를 새로 구성하는데, 이 프로젝트의 테스트는 전부 순수 로직이라 그 구성이 통째로 낭비다.
  `projects`로 나누면 이 13개는 `environment: 'node'`로 남아 1ms를 유지하면서, 앞으로 추가될 DOM 테스트만 그 비용을 지불한다.

## 5. MSW 배선과 모킹 경계

### 5-1. 서버 켜고 끄는 지점

**위치**

| 파일                       | 역할                                                        |
| -------------------------- | ----------------------------------------------------------- |
| `src/shared/mocks/node.ts` | `setupServer()` 인스턴스 생성                               |
| `vitest.setup.ts`          | 생명주기 훅 3개 (`beforeAll`, `afterAll`, `afterEach` 선언) |

서버 인스턴스를 `shared` 레이어에 둔 이유

- [MSW 공식 quick-start](https://mswjs.io/docs/quick-start)가 제시한 `src/mocks/node.ts`와 현재 프로젝트의 FSD 구조를 고려한 결정
- `shared`는 도메인을 모르는 공용 인프라 레이어이고 모든 상위 레이어가 참조할 수 있어, 어느 레이어의 테스트든 `@/shared/mocks/node`로 가져다 쓸 수 있음

### 5-2. 미모킹 요청 차단

- 설정값: **`'error'`**. `'warn'`(기본값)은 로그만 남기고 요청을 실제 네트워크로 통과한다. 인지한다고해도 이미 네트워크 요청이 가고 난 후이며, warn 메시지를 무시하기 쉬워 error로 강제함
- 확인 방법: 핸들러 없는 요청(`GET /api/products`)을 두 전략으로 각각 실행.
- 결과:

  | 전략                      | 실행 결과                                                                                                                                  | 요청이 실제로 나가는가 |
  | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
  | `'error'`                 | 실패 — `[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.`                                | X                      |
  | `'warn'` (서버 기동 상태) | 성공 — `status=200, totalCount=30`. 터미널 로그에는 경고만 남음: `[MSW] Warning: intercepted a request without a matching request handler` | O                      |

### 5-3. 앱 HTTP 클라이언트 직접 모킹 여부 점검

- 검색 결과: `vi.stubGlobal`/`vi.mock`/`globalThis.fetch =`/`vi.spyOn(_, 'fetch')`/`axios`를 전부 조회. **`vi.stubGlobal('fetch')` 3건(1개 파일)만 발견**, 나머지 형태와 axios는 0건(axios는 미설치).
- 발견된 곳과 마이그레이션 여부:

  | 파일                                   | 기존 방식                                                   | 처리                                     |
  | -------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
  | `src/shared/api/apiFetch.unit.test.ts` | `vi.stubGlobal('fetch', ...)` × 3 + `vi.unstubAllGlobals()` | `server.use(http.get(...))` × 3으로 교체 |

- 최종 확인 방법: **ESLint `no-restricted-syntax`로 정적 강제**.

  ```js
  {
    selector: "CallExpression[callee.object.name='vi'] > Literal[value='fetch']";
  }
  ```

## 6. Playwright / E2E 배치

- **Production build 위에서 돌게 만든 방법**: `webServer.command: 'pnpm start'`.
  `reuseExistingServer: !process.env.CI`도 함께 걸었다.

  로컬에서는 떠 있는 서버를 재사용해 반복 실행이 가능하고, CI에서는 항상 새로 기동하도록 강제

- **검증**: dev 서버 기동 상태에서 실행 시 `http://localhost:3000 is already used`로 exit 1

- **명령 배치**: 별도 `pnpm test:e2e`로 두고, `pnpm check` 체인의 **`build` 바로 뒤**에 붙였다.

  ```
  check = test → lint → typecheck → build → test:e2e
  ```

- **그렇게 정한 이유**: 빠른 테스트는 로컬에서, E2E는 CI에서 돌린다는 전제로 갈랐다.

  - `pnpm test`(vitest, 0.5초)에 넣지 않은 이유 — E2E는 서버 기동과 브라우저까지 얹혀 자릿수가 다르다. watch 루틴이 깨진다.
  - 그럼에도 `check`에 편입한 이유 — 별도 명령으로만 두면 CI가 E2E를 아예 안 돌린다. CI 워크플로는 `pnpm check` 하나만 실행하고, Chromium을 미리 받아두는 단계가 이미 있어 `check` 안에서 도는 것을 전제한 구조다.
  - **E2E가 재빌드하지 않는 이유** — `check`가 `build` 직후에 호출하므로 그 순서가 최신 빌드를 보장. Playwright가 `build && start`를 하면 한 번의 `check`에서 빌드가 두 번 돈다. 대신 `pnpm test:e2e`를 단독 실행하면 직전 빌드를 쓰게 되는데, 정확성은 CI(항상 `check` 전체 실행)에서 담보하고 로컬의 정확도 저하는 감수.

  실측: `pnpm check` 전체 exit 0, 약 15초, 빌드 1회.

- **`forbidOnly: Boolean(process.env.CI)`**: `.only`가 남으면 그 테스트만 돌고 나머지는 건너뛰는데 결과는 초록불이라 아무도 모른다. 로컬에서는 정당한 디버깅 수단이라 CI에서만 막는다.

- **`retries: 0` + `trace: 'retain-on-failure'`**: 재시도하지 않는다. mock API가 같은 프로세스 안에 있고 지연도 고정값(`waitForMockApi` 500ms)이라 외부 요인에 의한 실패 위험이 낮고, 수정 비용도 낮다.

- **속도가 문제될 때의 방어책**: 태그 + `--grep`으로 쪼갠다(`test('...', { tag: '@smoke' })` → `playwright test --grep @smoke`). 지금 E2E가 0개라 태그 체계를 미리 만들지 않고, 실제로 느려지는 게 확인되면 그때 붙인다.

## 7. 완료조건 점검

- [x] `pnpm check` 한 번에 기존 5개 테스트가 그대로 통과하는가
- [x] 새 컴포넌트 테스트가 같은 실행에서 함께 통과하는가
- [x] DOM이 필요 없는 테스트가 DOM 환경에서 돌고 있지 않은가
- [x] 앱 코드의 HTTP 클라이언트를 직접 바꿔치기한 곳이 남아 있지 않은가

### 실행 로그/근거

**1. 기존 테스트가 `pnpm check` 한 번에 통과**

과제가 든 5개 파일 경로(`src/app/api/home/route.test.ts` 등)는 6주차 FSD 전환으로 바뀌었고 파일도 13개로 늘었다. **"기존 테스트가 깨지지 않았다"로 해석**해 판정했다.

```
$ pnpm check   → exit 0
 Test Files  13 passed (13)
      Tests  68 passed (68)
```

**2. 새 컴포넌트 테스트가 같은 실행에서 함께 통과**

integration 테스트가 0개여서 임시 컴포넌트 테스트(`HeroSection.integration.test.tsx`)를 만들어 검증하고 삭제했다.

```
$ pnpm check   → exit 0
 Test Files  14 passed (14)     ← unit 13 + integration 1
      Tests  69 passed (69)
   environment 623ms            ← jsdom이 실제로 켜짐
```

**3. DOM 불필요 테스트가 DOM 환경에서 돌지 않음**

그룹별 단독 실행으로 `environment` 값을 분리 측정했다.

```
$ vitest run --project unit          13 files   environment    1ms
$ vitest run --project integration    1 file    environment  495ms
```

unit 13개가 DOM 환경을 **전혀 세우지 않는다**(1ms). 3절에서 `projects`로 나눈 목적이 달성됐다는 직접 증거다.

**4. HTTP 클라이언트 직접 바꿔치기 없음**

```
$ grep -rn "stubGlobal|unstubAllGlobals|globalThis.fetch =|global.fetch =|window.fetch =|spyOn(.*fetch" src app
  0건
$ grep -rn "axios" src app
  0건 (미설치)
$ pnpm lint
  ✖ 18 problems (0 errors, 18 warnings)   ← 경고는 기존 코드, 회귀 방지 규칙 오류 0
```

5-3의 ESLint 규칙이 통과한다. 마이그레이션 직전에는 같은 규칙이 3개 오류를 냈으므로, 규칙이 실제로 동작하면서 위반이 해소된 상태다.
