# 7주차 PR 설명 — 프론트엔드 성능 최적화

> **작성 안내**
> 값이 `-`인 항목은 아직 측정·관찰하지 않은 자리입니다. 실측 후 채웁니다.
> 상세 측정 기록은 아래 문서로 나눠져 있습니다. 이 PR에는 최종 비교 결과만 남깁니다.
> - 재현 조건: [measurement-conditions.md](./measurement-conditions.md)
> - 0단계 Before·4단계 After raw 값·기능 회귀: [baseline-and-regression.md](./baseline-and-regression.md)
> - 진단 기록표: [diagnosis-log.md](./diagnosis-log.md)
> - 1단계 Hero LCP: [01-hero-lcp.md](./01-hero-lcp.md)
> - 2단계 목록 pending·갱신·CLS: [02-list-pending-cls.md](./02-list-pending-cls.md)
> - 3단계 metadata·Open Graph: [03-metadata-og.md](./03-metadata-og.md)
> - Advanced A: [advanced-a-render-reduction.md](./advanced-a-render-reduction.md) (선택 시에만)
> 이 안내 블록은 PR 본문에 포함하지 말고 제출 전 삭제합니다.

---

## 📌 이번 PR 요약

- 주차: 7주차 (프론트엔드 성능 최적화 — 같은 사용자 경로의 병목 축소)
- 무엇을 / 왜: 같은 사용자 경로(홈 cold load, 느린 목록 갱신, 초기 HTML)를 반복 측정해 확인한 병목만 가장 작은 변경으로 줄였습니다. 관찰한 사실 → 원인 가설 → 반증 가능한 측정 → 변경 순서를 지켰고, 가설이 실측으로 틀렸다고 확인되면(fetchpriority, 상품명 클램프, 렌더링 경계 재분리) 개입하지 않거나 되돌렸습니다.
  1. **Hero LCP**: 원본 이미지(7.20MB, 3840×2160)를 표시 크기(1200×675)에 맞춰 `next/image`·WebP로 재인코딩했습니다. LCP를 지배하던 이미지 전송 구간이 8,000.8ms(97.3%)→319.7ms로 줄어 LCP 중앙값이 8,225.4ms→538.2ms(-93.46%)로 개선됐습니다.
  2. **목록 pending·갱신·CLS**: 서버 prefetch를 제거해 필터 셸이 1.5초를 기다리지 않고 즉시 응답(document TTFB 1.5s→7~10ms)하게 했고, 그리드 스켈레톤(최초 pending)·`placeholderData`(갱신 중 기존 목록 유지)·`findLastSuccessfulProductList`(갱신 실패 시 기존 목록 유지)로 상태 6가지를 구분했습니다.
  3. **metadata·Open Graph**: 루트 `title.template`·공통 `openGraph` 위에 홈·목록 `generateMetadata`를 얹어 초기 HTML에 페이지별 title·description·OG가 보이게 했고, 조회 실패 시 root 공통 metadata로 상속되게 했습니다.
- 이번 주에 하지 않은 것:
  - API의 고정 지연(홈 500ms, 목록 1.5s)을 줄이거나 제거하지 않았습니다 — 발제 범위 밖입니다.
  - Hero `fetchpriority="high"`는 보류했습니다 — 최대 절감 여지가 LCP의 2.0%뿐이라 97.3%인 전송량 문제를 먼저 다뤘습니다.
  - 홈 렌더링 경계(`await`·`Suspense` 위치)는 다시 나누지 않았습니다 — 홈 데이터 대기 비용이 이미 서버 응답 대기의 0.17%라 실측이 "경계를 나눠야 한다"는 가설을 지지하지 않았습니다.
  - 목록의 route/query prefetch는 손대지 않았습니다 — "다음 페이지마다 1.5초를 기다린다"는 문제가 아직 실측으로 확인되지 않은 열린 항목입니다.
  - 목록 재정렬 시 남은 CLS(같은 건수 갱신에서도 0.226, 카드 DOM 노드의 그리드 내 위치 이동이 원인)의 근본 대응은 미정으로 남겼습니다 — 클램프 가설은 실측으로 반증됐습니다.
  - Next Cache API(Advanced B), 관계없는 카드 렌더 축소(Advanced A)는 진행하지 않았습니다.
  - 3단계에서 홈 document TTFB가 13.1ms→521.9ms로 늘어난 것은 이번 PR에서 되돌리지 않았습니다 — 원인은 `/api/home` 호출 1회분(505~506ms)이며, metadata query failure를 재현하려고 direct-call 우회를 의도적으로 없앤 결과입니다. 되돌리면 3단계 요구인 실패 재현이 불가능해져 두 요구의 우선순위 판단이 남았습니다(`baseline-and-regression.md` "효과가 없었거나 악화된 변경" 참고).
- 상세 측정 기록: [measurement-conditions.md](./measurement-conditions.md) · [baseline-and-regression.md](./baseline-and-regression.md) · [diagnosis-log.md](./diagnosis-log.md) · [01-hero-lcp.md](./01-hero-lcp.md) · [02-list-pending-cls.md](./02-list-pending-cls.md) · [03-metadata-og.md](./03-metadata-og.md)

---

## 🧪 재현 조건 요약

SHA를 제외한 모든 조건을 Before/After에서 같게 두었습니다. 전체 조건표는 [measurement-conditions.md](./measurement-conditions.md)를 참고해 주세요.

| 조건       | 값                                               |
| ---------- | ------------------------------------------------ |
| Before SHA | `e81e7296d8b969c05de697583305cdf23c997a63`       |
| After SHA  | `e3fdf8e545f8c5bab28f45e431eea5c817188422`       |
| 실행       | `pnpm build && pnpm start` (개발 서버 측정 없음) |

---

## 📊 Before / After 측정값 비교

**각 지표별 Before / After 비교** (같은 조건 5회 측정의 중앙값·범위)

| 지표 | Before 중앙값 (범위) | After 중앙값 (범위) | 5회 범위보다 큰 변화인가 / 어느 병목과 연결되는가 |
| ---- | -------------------- | ------------------- | ------------------------------------------------- |
| FCP  | 526.7 (511.9–548.7)  | 864.3 (855.3–1133.5) | 범위(36.8ms)보다 큰 악화(+337.6ms)입니다 — 3단계에서 서버가 `/api/home`을 실제 HTTP로 경유하게 되며 document TTFB가 늘어난 것과 연결됩니다(`baseline-and-regression.md` "효과가 없었거나 악화된 변경" 참고) |
| LCP  | 8225.4 (8203.5–8243.4) | 880.9 (872.0–1175.2) | 범위(39.8ms)보다 훨씬 큰 개선(-7344.5ms)입니다 — 1단계 Hero 재인코딩(7.20MB→79.1KB)이 지배적입니다. 다만 구간 내부에서 TTFB 비중이 커진 채 남아 있습니다(아래 LCP 구간 비교) |
| CLS  | 0 (0–0)              | 0 (0–0)              | 변화가 없습니다 |

> 5회 raw 값의 범위보다 작은 변화는 개선으로 주장하지 않습니다.

**LCP 구간 비교**

| 항목                       | Before | After |
| -------------------------- | ------ | ----- |
| LCP element                | `img.HeroSection-module__V4ICrW__image` — 원본 서빙, 원본 해상도 3840×2160 그대로 전송 | 동일 selector, `next/image`(`_next/image?...w=1200&q=75`) 경유 |
| Hero 이미지 전송 크기      | 7,545,525 B (7.20 MB) | 80,965 B (79.1 KB) |
| Hero 이미지 요청 시작 시점 | 182.0 ms | 530.7 ms |
| 가장 길었던 구간           | 이미지 전송 8,000.8 ms (97.3%) | 서버 응답 대기(TTFB) 521.9 ms (59.2%)입니다 — 1단계 시점 13.1 ms에서 다시 증가했습니다 |

---

## 🤖 AI 사용 표기

| 항목                                      | 내용 |
| ----------------------------------------- | ---- |
| AI에게 제시한 직접 확인한 근거            | Lighthouse 5회 raw 값, Performance filmstrip 표시 순서, Network waterfall(요청 URL·전송 크기·시작 시점), `LayoutShift.sources`, `curl` TTFB, 서버 stdout 호출 로그처럼 직접 확인한 사실만 먼저 제시하고, 그 위에서 원인 가설·반증 방법을 함께 정리했습니다(`diagnosis-log.md` 형식) |
| 채택한 제안                               | Hero 이미지를 표시 크기에 맞춰 `next/image`·WebP로 재인코딩(1단계) · 서버 prefetch 제거 후 client `useQuery`로 목록 데이터 소유권 일원화(2단계) · `findLastSuccessfulProductList`로 갱신 실패 시 기존 목록 유지(2단계) · 루트 `title.template`·공통 `openGraph` 위에 페이지별 `generateMetadata` 추가(3단계) |
| 반려한 제안과 이유                        | `fetchpriority="high"` — 최대 절감이 LCP의 2.0%뿐이라 보류했습니다 · 상품명 2줄 클램프로 CLS 해결 — 카드 높이를 완전히 균일화해도 CLS가 그대로여서(0.217439→0.217439) 반증됐고, 실제 원인은 카드 DOM 노드의 그리드 내 위치 이동이었습니다 · 홈 렌더링 경계 재분리 — 홈 데이터 대기가 이미 서버 응답 대기의 0.17%라 실측이 가설을 지지하지 않아 무개입으로 판단했습니다 · "홈 `generateMetadata`가 fetch memoization으로 본문 prefetch와 합쳐질 것" — 최초 계수에서 2회로 읽어 반증했다고 판단했으나, 재조사에서 1회임이 확인돼 **최초 판정을 철회하고 가설을 채택**했습니다(`03-metadata-og.md` "홈 호출 횟수 재조사") |
| AI가 작성한 파일·함수 (`// AI 생성` 표기) | 1~3단계 diff(27개 파일)에 `// AI 생성` 주석 28건이 있습니다. 대표: `HeroSection.tsx`(1단계) · `findLastSuccessfulProductList.ts`·`ProductGridSkeleton.tsx`·`ProductListSection.tsx`(2단계) · `generateHomeMetadata.ts`·`generateProductListMetadata.ts`·`RootLayout.tsx`·`siteMetadata.ts`(3단계) |
| 직접 검토 여부                            | 검토했습니다 — AI가 제시한 원인·수치를 코드(query key, `queryFn`, `apiFetch` 등)와 실측(`curl`, `PerformanceObserver`, 서버 로그)으로 단계마다 재대조했습니다. 근거 없이 채택하지 않아 클램프·`fetchpriority` 두 사례가 반증으로 이어졌고, fetch memoization은 반대로 **최초 계수(2회)가 재현되지 않아 판정 자체를 철회**했습니다 |

---

## 📚 이번 주 학습

- 학습 주제: Core Web Vitals 진단 방법론(Lab 지표를 구간별로 쪼개 병목을 좁히는 법), Next.js App Router의 렌더링 경계(Suspense·prefetch)와 서버 metadata 해석·병합 규칙, TanStack Query의 pending·에러 상태별 화면 설계와 캐시 소유권
- 배운 것 / 새로 적용한 것:
  - LCP를 서버 응답 대기·요청 시작 대기·전송·렌더 지연 4구간으로 쪼개면 "무엇을 줄여야 하는지"가 수치로 드러납니다. 이번에는 전송 구간이 97.3%를 차지해, 다른 후보(fetchpriority, 렌더링 경계 분리)의 최대 절감 여지가 2% 안팎임을 손대기 전에 알 수 있었습니다.
  - CLS는 눈에 보이는 "카드 크기 차이"가 아니라 `LayoutShift.sources`로 실제 이동한 DOM 노드를 확인해야 원인을 알 수 있습니다 — 카드 높이를 완전히 균일화해도 CLS가 조금도 안 변한 게 그 증거입니다.
  - Next.js는 crawler UA를 감지해 일반 사용자와 다른 metadata 응답 전략(셸 우선 스트리밍 vs head 완성 후 응답)을 씁니다 — TTFB만 보면 이 비용이 감춰집니다(`03-metadata-og.md`).
  - 계수는 누적 로그를 통째로 읽지 말고 "요청 직전/직후 줄 수의 차분"으로 세야 합니다 — 홈 `/api/home` 호출을 처음엔 2회로 기록했는데, 이 방식으로 다시 세니 1회였고 TTFB 산술(단독 506ms vs 문서 522ms)도 1회를 가리켰습니다. 반증했다고 적은 결론을 실측으로 다시 뒤집은 사례입니다.
  - memoization opt-out 조건은 코드에서 확인해야 합니다 — 목록은 `queryFn: ({ signal }) => ...`로 `AbortSignal`을 넘겨 Next.js 문서 기준 memoization 대상에서 빠집니다. 지금은 서버 측 호출자가 하나뿐이라 드러나지 않지만, 목록에 server prefetch를 되살리면 중복이 발생합니다.

---

## 🤔 고민한 점 / 막혔던 부분

- 로컬 Chrome 원격 디버깅 권한과 auto mode classifier의 CDP `Emulation`/`Tracing` 차단으로 2단계 CLS 자동화 실측이 두 차례 막혔습니다. CDP 대신 `PerformanceObserver`로 우회해 해소했지만, 이 방식은 CPU·네트워크 쓰로틀링을 재현하지 않아 해당 CLS 값은 쓰로틀링 없는 조건이라는 제약이 남았습니다(`02-list-pending-cls.md`).
- 목록 갱신 실패 재현은 CDP `Fetch` 도메인으로 API만 강제 실패시키고, `git stash`로 수정 전/후 코드를 오가며 같은 시나리오를 대조해야 확인할 수 있었습니다 — 한 번의 관찰로는 "실제로 고쳐졌다"를 주장하기엔 부족했습니다.
- 같은 건수(6건→6건) 정렬 변경에도 CLS 0.226이 남는 근본 원인(재정렬로 인한 카드 DOM 노드의 그리드 내 위치 이동)은 확인했지만, 클램프 가설이 반증된 뒤 이에 맞는 다음 시도는 아직 정하지 못했습니다 — 열린 항목으로 남겼습니다.
- 3단계에서 홈의 `generateMetadata`와 본문 prefetch가 fetch memoization으로 합쳐질 거라 가정했다가, 서버 로그 계수에서 2회로 읽고 가설이 반증됐다고 기록했습니다. 그런데 재조사에서 어떤 조건으로도 2회가 재현되지 않았고(UA·요청 유형 5종, dev 서버, 프로브 실험), TTFB 산술도 1회를 가리켜 **최초 계수가 틀렸다는 결론**에 이르렀습니다. 원본 로그가 남지 않아 무엇을 잘못 셌는지는 특정하지 못한 채로 남았습니다. TTFB 증가의 원인은 memoization이 아니라 direct-call 우회 제거였고, 이를 되돌릴지는 metadata 실패 재현 요구와 충돌해 아직 결정하지 못했습니다.
- After 측정에서 최대 리소스 실효 대역폭이 Before보다 낮게 나온 소견이 있었습니다 — Hero 전송량이 줄며 대역폭 역산 표본이 작아진 결과로 보이지만, 미확정 판단이라 별도 검증이 필요한 채로 남았습니다(`baseline-and-regression.md`).

---

## 🙋 피드백 받고 싶은 부분

-
