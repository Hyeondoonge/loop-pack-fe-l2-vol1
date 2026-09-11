# 3단계 결정 — smoke test 범위와 판정 수준

- 대상: `docs/assignments/week-10-quests.md` 5번(158~189번 줄) Vercel 배포 & smoke test 운영 확인
- 선행 결정: [01-env-variable-decisions.md](./01-env-variable-decisions.md), [02-env-validation-decisions.md](./02-env-validation-decisions.md), [04-quality-gate-ci-jobs.md](./04-quality-gate-ci-jobs.md) 4-8
- 이 문서가 다루는 범위: **어느 경로를 확인하고 무엇을 판정 기준으로 삼을지까지.** 배포 URL 접근 방법(Vercel Deployment Protection)과 CI 자동 실행 연동은 8번에 미결로 남겼다.
- 상태: **작성 시점 결정** (2026-09-11). 아직 코드 없음.

## 목차

1. [왜 하는가 — CI가 구조적으로 못 보는 층](#1-왜-하는가--ci가-구조적으로-못-보는-층)
2. [이 프로젝트에서 CI가 검증할 수 없는 코드](#2-이-프로젝트에서-ci가-검증할-수-없는-코드)
3. [판정 수준 — 데이터 존재까지 확인한다](#3-판정-수준--데이터-존재까지-확인한다)
4. [경로 3개](#4-경로-3개)
5. [Open Graph 확인은 넣지 않는다](#5-open-graph-확인은-넣지-않는다)
6. [실행 시점](#6-실행-시점)
7. [파일 구성](#7-파일-구성)
8. [아직 정하지 않은 것](#8-아직-정하지-않은-것)
9. [References](#9-references)

## 1. 왜 하는가 — CI가 구조적으로 못 보는 층

| 층 | 검증 주체 | 대상 |
| --- | --- | --- |
| 소스가 올바른가 | CI (lint·typecheck·test·build·E2E) | 코드 |
| 배포 산출물이 그 환경에서 도는가 | **smoke test** | 배포된 URL |

CI의 E2E는 `playwright.config.ts`의 `webServer`가 띄운 `localhost:3000`을 검증한다. 환경 변수는 워크플로가 주입한 `APP_ORIGIN=http://localhost:3000` 하나뿐이고, Vercel이 주입하는 값은 존재하지 않는다. 따라서 배포 환경에서만 달라지는 것은 원리적으로 확인되지 않는다.

과제 185번 줄이 "전체 E2E가 아니라 *배포가 완전히 깨졌는지* 확인할 최소 경로"로 제한한 것도 같은 이유다. 기능 검증은 이미 E2E가 했고, smoke test는 다른 층을 본다.

## 2. 이 프로젝트에서 CI가 검증할 수 없는 코드

`getAppOrigin()`에 Vercel 전용 분기가 있다.

```ts
// src/shared/config/appOrigin.ts
export function getAppOrigin(): string {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;   // ← Preview 배포에서만 실행
  }
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new Error('APP_ORIGIN이 설정되지 않았습니다.');
  return origin;
}
```

`VERCEL_ENV`·`VERCEL_URL`은 Vercel 플랫폼이 주입한다. CI에도 로컬에도 없으므로 **이 분기는 배포된 Preview에서만 실행된다.** 단위 테스트(`appOrigin.unit.test.ts`)가 `vi.stubEnv`로 분기 로직을 검증하지만, 실제 주입값이 무엇인지는 배포에서만 드러난다.

### 이 함수에 의존하는 기능 — 실측

호출처는 둘이다.

| 호출처 | 쓰임 | 깨졌을 때 |
| --- | --- | --- |
| `src/shared/api/apiFetch.ts:21` | **서버 사이드 모든 API 요청의 절대 URL** | 서버 렌더 데이터가 전부 실패 |
| `src/_app/RootLayout.tsx:25` | `metadataBase` | Open Graph·canonical URL이 어긋남 |

```ts
// apiFetch.ts:21
const url = typeof window === 'undefined' ? `${getAppOrigin()}${input}` : input;
```

서버에서는 상대 경로로 fetch할 수 없어 절대 URL이 필요하다. 그리고 **이 프로젝트의 모든 라우트가 요청 시 서버 렌더링된다** — 빌드 출력의 라우트 16개가 전부 `ƒ (Dynamic) server-rendered on demand`다.

따라서 `getAppOrigin()`이 잘못된 값을 반환하면 홈·목록을 포함한 모든 화면에서 데이터가 비거나 에러가 난다. **사용자가 사이트를 쓸 수 없는 상태**다.

## 3. 판정 수준 — 데이터 존재까지 확인한다

- 질문: 각 경로에서 무엇을 assert할 것인가
- 판단 기준: **CI가 잡을 수 없는 것을 잡는 수준**
- 결정: **데이터가 화면에 존재하는지까지 확인한다.**

| 수준 | 확인 | CI가 이미 잡는가 | 배포 고유 문제를 잡는가 |
| --- | --- | --- | --- |
| A. HTTP 200 | 서버가 응답함 | 아니오 | 일부 — 서버가 떠 있음만 |
| B. 요소 렌더 | DOM에 특정 요소 존재 | **E2E가 로컬에서 이미 확인** | 일부 |
| C. 데이터 존재 | 목록에 항목이 1개 이상 | 아니오 — CI는 mock 경계 안 | **예** |

**A를 택하지 않는 이유.** `getAppOrigin()`이 틀려도 페이지 자체는 200을 반환할 수 있다. 서버 컴포넌트가 데이터 없이 렌더되거나 에러 경계가 fallback을 그리면 HTTP 상태는 정상이다. 2번에서 본 가장 치명적인 실패를 놓친다.

**B를 택하지 않는 이유.** 요소 렌더는 E2E가 로컬에서 이미 검증한다. 배포에서 다시 확인해도 얻는 정보가 적고, 데이터 층은 여전히 안 본다.

**C를 택하는 이유.** 환경 변수 → `getAppOrigin()` → `apiFetch` → 실제 API 응답까지의 경로 전체를 한 번에 지난다. 이 경로는 CI에서 실행되지 않는다(CI의 `APP_ORIGIN`은 localhost이고 MSW 모킹 경계 안이다).

**감수하는 것.** 데이터 내용에 의존하므로 배포와 무관한 이유로 깨질 수 있다. 이를 줄이기 위해 **특정 값이 아니라 "항목이 1개 이상 있다" 수준으로만 확인한다.** 상품명이나 개수를 단언하면 목록 데이터가 바뀔 때마다 smoke test가 깨진다.

## 4. 경로 3개

1번에서 정의한 "배포가 완전히 깨진 상태"를 세 증상으로 나누고, 각각 하나씩 덮는다.

| # | 경로 | 확인 | 덮는 증상 |
| --- | --- | --- | --- |
| 1 | `/` | 홈이 렌더되고 서버 데이터가 있다 | 렌더 실패 · 데이터 없음 |
| 2 | `/products` | 목록이 렌더되고 항목이 1개 이상 | 라우팅 실패 · 데이터 없음 |
| 3 | `/orders/new` | 미로그인 접근 시 로그인 화면으로 이동 | 미들웨어·인증 경로 실패 |

- 3번이 필요한 이유: 1·2번이 전부 통과해도 미들웨어가 깨지면 인증 경로만 실패한다. 쿠키 처리와 리다이렉트는 배포 환경의 프록시 계층을 지나므로 로컬과 동작이 달라질 수 있다. 로그인 수행 자체는 `e2e/auth.spec.ts`가 검증하므로 여기서는 리다이렉트 도달까지만 본다.
- 채택하지 않은 것: **`/login` 추가.** 3번이 리다이렉트로 로그인 화면을 거치므로 중복이다.
- 채택하지 않은 것: **상세 페이지.** 라우트가 존재하지 않는다(빌드 출력 확인).
- 채택하지 않은 것: **4~5개로 늘리기.** 과제 범위 안이지만 같은 증상을 중복 확인하게 된다. 배포가 정상이면 전부 통과하고 깨지면 대부분 동시에 실패하는 것이 smoke test의 정상 동작이므로, 한두 개만 실패하는 구성은 기능 테스트가 섞인 신호다.

## 5. Open Graph 확인은 넣지 않는다

- 질문: Preview 전용으로 `og:url`이 배포 URL과 일치하는지 확인할 것인가
- 결정: **넣지 않는다.**

**의존 기능 분석.** `metadataBase`가 영향을 주는 것은 Open Graph URL, `og:image`의 절대 경로화, canonical URL이다. 깨졌을 때의 사용자 영향은 **링크를 외부에 공유할 때 미리보기가 잘못 뜨는 것**이고, 사이트 이용 자체에는 지장이 없다.

**제외 근거는 실패 비용이 작아서가 아니다.** 같은 원인이 더 치명적인 증상으로 먼저 드러나기 때문이다.

```
getAppOrigin()이 잘못된 값을 반환
   ├→ apiFetch 실패    → 모든 화면의 데이터 없음  ← 경로 1·2에서 잡힘
   └→ metadataBase 오류 → og:url 어긋남
```

두 증상의 원인이 같은 함수의 같은 반환값이므로, 데이터 확인(3번의 판정 수준 C)이 통과하면 `getAppOrigin()`이 올바른 값을 돌려줬다는 뜻이다. `og:url`을 따로 확인해도 새로운 정보가 나오지 않는다.

**부수 이득.** Preview와 Production의 smoke test 내용이 같아져 파일이 갈라지지 않는다. 과제 187번 줄이 양쪽에서 실행하라고 요구하므로 동일한 스펙을 두 URL에 돌리는 편이 단순하다.

**재검토 조건.** `metadataBase`만 틀리고 `apiFetch`는 정상인 상황이 실제로 관측되면 그때 넣는다. 지금은 그런 경로가 없다.

## 6. 실행 시점

[04-quality-gate-ci-jobs.md](./04-quality-gate-ci-jobs.md) 4-8·5번에서 정한 것을 따른다.

| 시점 | 목적 | 차단 |
| --- | --- | --- |
| `develop` push → Preview 배포 후 | develop → main 머지 판단 근거 | 하지 않음 |
| `main` push → Production 배포 후 | rollback 판단 근거 | 불가능(배포 후) |

과제 187번 줄이 Preview와 Production 양쪽 실행을 요구하므로 두 시점 모두 필요하다.

## 7. 파일 구성

```
smoke/                          기존 e2e/ 와 분리
playwright.smoke.config.ts      webServer 없음, baseURL = DEPLOYMENT_URL
package.json                    "test:smoke": "playwright test --config playwright.smoke.config.ts"
```

실행 형태는 과제 186번 줄을 그대로 따른다.

```bash
DEPLOYMENT_URL=https://... pnpm test:smoke
```

- 별도 config를 두는 이유: 기존 `playwright.config.ts`는 `webServer.command: 'pnpm start'`로 로컬 서버를 띄운다. smoke test는 배포된 URL을 대상으로 하므로 서버 기동이 불필요하고, 같은 config에 project로 끼우면 이 설정을 조건부로 만들어야 한다. 파일 하나 추가가 더 짧다.
- 채택하지 않은 것: **`--grep` 태그로 같은 config 안에서 분리.** 위 `webServer` 문제가 남는다.
- 채택하지 않은 것: **기존 E2E 스펙 재사용.** 과제 185번 줄이 명시적으로 배제한다.

## 8. 아직 정하지 않은 것

- **배포 URL 접근 방법** — Preview URL이 Vercel SSO로 302 리다이렉트된다. 해제할지 bypass 토큰을 쓸지는 실제로 실행해서 막히는 것을 확인한 뒤 정한다. 과제에 명시된 항목이 아니라 5번을 수행하기 위한 전제 조건이다.
- **CI 자동 실행 연동** — Preview URL을 워크플로에서 받아오는 방법. 발제 237번 줄 기준 선택 사항이다.
- **Production smoke test 실패 시 알림 방식** — 04 5번이 rollback 판단 입력으로만 정했다.

## 9. References

| 구분 | 출처 |
| --- | --- |
| 과제 | `docs/assignments/week-10-quests.md` 5번(158~189번 줄), 체크리스트(246~248번 줄) |
| 발제 | `docs/mentor-notes/round10-cicd-자동화-배포.md` 235~237번 줄(Preview Smoke Test) |
| 코드 | `src/shared/config/appOrigin.ts`, `src/shared/api/apiFetch.ts:21`, `src/_app/RootLayout.tsx:25` |
| 실측 | `pnpm build` 라우트 출력 — 16개 전부 `ƒ (Dynamic)` |
