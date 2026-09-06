# 1단계 작업 계획 — 인증 구현

- 대상: `docs/assignments/week-09.md` 1단계(109~131번 줄)
- 판단 항목 기록처: [01-auth-guard-design.md](./01-auth-guard-design.md)
- 최종 제출처: PR 본문 (과제 문서 96번 줄)

## 착수 시점 실측 (2026-08-30)

계획의 전제가 된 코드 상태. 바뀌면 계획도 다시 봐야 한다.

- 화면은 홈(`/`)·상품목록(`/products`) 둘뿐. 로그인·주문서·주문내역·마이페이지 화면 없음.
- 장바구니·위시리스트는 헤더 카운트만 있고 **페이지 자체가 없음**. 상태는 Zustand 클라이언트 상태(5주차 결정).
- `Header`(`src/widgets/header/ui/Header.tsx`)는 `'use client'`, `RootLayout`에 상주. cart·wishlist 개수만 구독.
- 공통 HTTP 클라이언트는 `src/shared/api/apiFetch.ts` 하나.
- `pnpm build` 기준 정적(`○`)은 `/performance-lab/inp`, `/_not-found` 둘뿐. 홈·목록은 이미 `ƒ`(동적).
  → 세션 쿠키 읽기로 정적 생성이 깨질 위험 대상은 사실상 `/performance-lab/inp` 하나(과제 118번 줄 경고의 실제 영향 범위).
- 인증 API 4개 라우트는 `app/api/**`로 이동 완료(커밋 `583e99a2`), `pnpm build` Route 목록에서 확인됨.
- `proxy.ts` 없음(신규 생성 대상). Next 16은 `middleware.ts`가 아니라 `proxy.ts` 컨벤션.

## 작업 흐름과 선수 관계

```
A. 결정 게이트 (코드 0줄) — 완료 (2026-08-31)
   A1 보호 경로 경계 ─────┐  ← 만들 화면 수가 여기서 확정. 작업량의 출발점
   A2 복원 파라미터 + 외부주소 차단 방식 ─┤
   A3 쿠키 검증 수준(서명까지 vs 존재만) ─┴─→ 이 셋이 proxy.ts 한 파일을 결정
   → 상세 결정·근거는 01-auth-guard-design.md 4~6번 항목

B. 화면 뼈대 — 완료 (2026-08-31)  ← A1 결과대로만. 개수 늘리지 않음
   B1 /login                     로그인 (가드 목적지, 비보호)
   B2 /orders/new  /orders       주문서·주문 내역 (보호, 과제 필수)
      /mypage  /cart  /wishlist  마이페이지·장바구니·위시리스트 (보호, A1 판단)
   ※ 라벨·role 기반 마크업으로 잡아두면 4단계 셀렉터 비용을 선불로 끝냄

C. 가드 — 완료 (2026-08-31)  ← B 필요 (돌려보낼 화면이 있어야 함)
   C1 proxy.ts: matcher=A1, 파라미터=A2, 검증수준=A3
   C2 로그인 성공 → 복원 경로 이동
   ✓ pnpm start 실측 (과제 117번 줄: 빌드 통과 ≠ 동작) → 아래 "C 단계 실측 기록"

D. 세션 상태 — 완료 (2026-08-31)  ← C 필요 (가드가 없으면 로그인 상태 화면을 볼 수 없음)
   D1 세션 상태 관리 방식(항목7) → 세션 읽는 위치(항목8)
   D2 Header 로그인 상태 반영
   ✓ pnpm build Route 목록 전후 비교 → 아래 "D 단계 실측 기록"

E. 401 단일 처리  ← D 필요 (세션 읽는 자리가 정해져야 401 받을 위치가 정해짐)
   E1 401 처리 위치(항목1) — apiFetch 계층이 유력
   E2 미로그인 vs 만료 구분 기준(항목2)
   E3 만료 안내 화면

F. 로그아웃       ← E 이후. 만료와 로그아웃이 같은 정리 경로를 쓸지 여기서 갈림
   F1 정리 방침(항목3) → 구현

G. 완료 검증 (아래 "완료조건" 절)
```

## C 단계 실측 기록 (2026-08-31, `pnpm start` 프로덕션 빌드 위)

**신설 파일**

- 화면 6개: `src/_pages/{login,order-form,order-history,mypage,cart,wishlist}` + `app/**/page.tsx` 재수출 6개
- 가드: `proxy.ts` (레포 루트)
- 검증 로직: `src/shared/lib/isSafeRedirect.ts` + `isSafeRedirect.unit.test.ts` (11 케이스 통과)

**curl 실측**

| 경로 | 미로그인 | 로그인 쿠키 있음 | 위조 쿠키(`session=fake.value`) |
| --- | --- | --- | --- |
| `/orders/new` | 307 → `/login?next=http%3A%2F%2Flocalhost%3A3000%2Forders%2Fnew` | 200 | — |
| `/orders` | 307 → `/login?next=...%2Forders` | 200 | — |
| `/mypage` | 307 → `/login?next=...%2Fmypage` | 200 | 307 (차단) |
| `/cart` · `/wishlist` · `/login` · `/products` | 200 | — | — |

- 위조 쿠키가 307로 차단된 것이 6번 결정(서명 검증)의 실측 근거다. 존재만 확인하는 방식이었다면 200으로 통과했을 케이스다.

**브라우저 실측 (Playwright)**

1. 미로그인 `/orders/new` 진입 → `/login?next=http%3A%2F%2Flocalhost%3A3000%2Forders%2Fnew`로 이동
2. `looper1@loopers.dev` / `looper1234`로 로그인 → `/orders/new`로 복원, `h1 "주문서"` 표시 → **완료조건 1 충족**
3. open redirect 방어: `/login?next=https%3A%2F%2Fevil.com`으로 로그인 → `evil.com`으로 나가지 않고 홈(`/`)으로 이동

**빌드·테스트**

- `pnpm build`: Route 목록에 신설 6개 화면 + `ƒ Proxy (Middleware)` 인식. `/performance-lab/inp`는 `○`(정적) 유지.
- `pnpm vitest run --exclude '.claude/**'`: 21파일 153테스트 통과.
  - `pnpm test`를 그대로 돌리면 `.claude/worktrees/test-visual-regression/` 하위 파일까지 수집되어 27건이 실패한다. 이 레포 파일과 무관한 다른 브랜치 워크트리이며, 이번 변경 이전부터 있던 상태다.
- `pnpm lint`: 에러 0 (경고 32건은 전부 기존 파일), `pnpm typecheck` 통과.

## D 단계 실측 기록 (2026-08-31, `pnpm start` 프로덕션 빌드 위)

**신설·변경 파일**

- 신설: `src/entities/auth/{model/types.ts, api/getMe.ts, api/authQueries.ts, index.ts}`
- 변경: `src/_app/RootLayout.tsx`(세션 prefetch → dehydrate), `src/widgets/header/ui/Header.tsx`(`useQuery`로 로그인 상태 표시)

**정적 생성 범위 변화** (항목 8 결정의 대가)

| | 변경 전 | 변경 후 |
| --- | --- | --- |
| 정적(`○`) | `/_not-found` `/cart` `/login` `/mypage` `/orders` `/orders/new` `/performance-lab/inp` `/wishlist` (8개) | 없음 |
| 동적(`ƒ`) | `/` `/products` + api 라우트 | **전체** |

- 7주차 기준선 대상인 홈(`/`)·목록(`/products`)은 변경 전에도 `ƒ`였으므로 기준선에 영향 없음.

**초기 HTML 로그인 상태 반영** — `curl`은 JavaScript를 실행하지 않으므로, 아래 결과가 곧 "JS 실행 전에도 로그인 여부가 보인다"(과제 118번 줄)의 증거다.

| 경로 | 미로그인 | 세션 쿠키 있음 |
| --- | --- | --- |
| `/` | `로그인` 링크 | `루퍼1님` |
| `/products` | `로그인` 링크 | `루퍼1님` |
| `/cart` | `로그인` 링크 | — |
| `/mypage` | (가드가 리다이렉트) | `루퍼1님` |
| `/orders` | (가드가 리다이렉트) | `루퍼1님` |

**구현상 주의점**

- 서버(RSC)에서 `/api/auth/me`를 부를 때는 쿠키가 자동으로 실리지 않아, `RootLayout`이 `cookies().toString()`을 `getMe`에 넘겨 `cookie` 헤더로 전달한다. 브라우저에서는 같은 origin이라 자동으로 붙는다.
- `authQueries.me()`의 `queryKey`는 `['auth','me']`로 고정하고 쿠키 헤더는 `queryFn` 클로저로만 넘긴다 — 세션 토큰이 캐시 키에 섞이면 서버·클라이언트 캐시가 서로 hit되지 않는다.
- `getMe`는 401을 예외가 아니라 `null`로 돌려준다. 로그인하지 않은 사용자에게도 헤더는 그려져야 하기 때문이다. **다른 요청의 401을 어떻게 다룰지는 항목 1·2(E 단계)에서 정한다.**

**검증**: `pnpm vitest run --exclude '.claude/**'` 21파일 150테스트 통과, `pnpm lint` 에러 0, `pnpm typecheck` 통과.

## 완료조건

과제 129~131번 줄. **`pnpm start`로 띄운 상태에서 확인한다.**

1. 미로그인으로 보호 경로에 들어가면 로그인 후 원래 경로로 돌아온다.
2. 세션이 만료되면 다음에 무엇을 해야 할지 화면에서 알 수 있다.

과제 310~320번 줄 체크리스트(1단계 / 인증):

- [ ] 미로그인으로 보호 경로에 들어가면 로그인으로 이동하는가
- [ ] 로그인 후 원래 가려던 경로로 돌아오는가
- [ ] 복원 경로로 외부 주소로 나가지 못하게 막았는가
- [ ] `pnpm start`로 띄운 상태에서 보호 경로 요청이 500이 아닌가
- [ ] 초기 HTML에 로그인 상태가 반영되는가
- [ ] 세션 만료 처리 위치를 한 곳으로 정하고 근거를 남겼는가
- [ ] 로그아웃 시 클라이언트 상태 정리 방침을 정하고 이유를 적었는가
- [ ] 보호 경로의 경계를 정했는가
- [ ] 보호할 화면이 없었다면 만들었는가

과제 365~368번 줄 중 1단계 시점에 해당하는 공통 항목:

- [ ] 8주차 테스트가 그대로 통과하는가
- [ ] `pnpm check`가 통과하는가

- **직렬 필수**: A1 → B → C → D → E → F (각 단계가 앞 단계 산출물을 입력으로 씀)
- **병렬 가능**: B1↔B2, D2↔E1은 서로 독립

## 다른 단계와의 선수 관계

- 2단계 계측이 1단계 인증 흐름에 `identify()`·`reset()`을 붙이고(과제 144번 줄), 5단계가 1단계 구현을 망가뜨려 검증한다(242번 줄).
- 따라서 로그인·로그아웃 로직을 한 자리에 모아두면 이후가 쉬워진다. 다만 **2단계용 계측 훅을 미리 파두지 않는다** — 필요해지면 그때.

## 진행 규칙

- 판단·근거 문장은 직접 작성한다. Claude는 질문·검증만 하고, 항목 승인 전까지 다음으로 넘어가지 않는다.
- 객관적 사실(명령 실행 결과, 측정값)은 Claude가 기록해도 된다.
