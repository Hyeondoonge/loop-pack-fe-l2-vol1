# 7주차 성능 측정 기록과 진단 노트

> **작성 안내**
> 값이 `-` 인 항목은 아직 측정·관찰하지 않은 자리다. 실측 후 채운다.
> 이 문서는 PR 본문에서 분리한 상세 측정 기록·진단·의사결정 자료다. PR의 최종 비교 결과(0단계·4단계 요약)는 [pr-description.md](./pr-description.md)를 참고한다.
> 이 안내 블록은 문서 완성 후 삭제한다.

---

## 🧪 재현 조건 (Before·After 동일)

SHA를 제외한 모든 조건을 Before/After에서 같게 둔다.

| 조건 | 값 |
| --- | --- |
| Before SHA | - |
| After SHA | - |
| 실행 | `pnpm build && pnpm start` (개발 서버 측정 없음) |
| URL | - |
| 사용자 행동 | - |
| load 조건 | cold load / warm navigation 중 - (섞지 않음) |
| viewport | - |
| throttling | - |
| 브라우저 | - |
| Lighthouse 버전 | - |
| 브라우저 프로필 | 확장 없는 별도 프로필 |
| `APP_ORIGIN` | build와 runtime에 같은 값 — - |

> localhost Open Graph URL은 배포 증거로 쓰지 않는다.

---

## 0️⃣ Before — 5회 raw 값과 관찰

**홈 cold load**

| 지표 | 1 | 2 | 3 | 4 | 5 | 중앙값 | 최소 | 최대 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCP | - | - | - | - | - | - | - | - |
| LCP | - | - | - | - | - | - | - | - |
| CLS | - | - | - | - | - | - | - | - |

**함께 확인한 증거**

| 항목 | 관찰 |
| --- | --- |
| LCP element | - |
| Performance filmstrip 표시 순서 (Header · 페이지 제목 · Hero) | - |
| Network waterfall — document 요청 URL·시작·전송 크기 | - |
| Network waterfall — 홈 데이터 요청 URL·시작·전송 크기 | - |
| Network waterfall — Hero 이미지 요청 URL·시작·전송 크기 | - |
| Layout Shifts — 이동한 요소와 shift score | - |

**목록 녹화** (`/api/products?scenario=slow`)

| 상황 | 관찰 |
| --- | --- |
| 데이터 없는 최초 진입 | - |
| 기존 목록이 있는 갱신 | - |
| 검색·카테고리·정렬·페이지를 빠르게 연속 변경 (현재 URL의 active query와 화면 일치 여부) | - |
| 취소된 요청 | - |

**측정 흔들림 판단**: 5회 raw 값의 범위 대비 유의미한 변화인지 이후 4단계 재측정과 함께 판단한다.

---

## 🔍 진단 기록표

| 관찰한 사실 | 원인 가설 | 반증할 측정 | 가장 작은 변경 | 결과 (채택 / 되돌림 / 무개입) | 상세 |
| --- | --- | --- | --- | --- | --- |
| - | - | - | - | - | - |
| - | - | - | - | - | - |
| - | - | - | - | - | - |

> 5회 raw 값의 범위보다 작은 변화는 개선으로 주장하지 않는다.

---

## 1️⃣ Hero LCP

**LCP 구간 분해**

| 구간 | Before | After | 변경 |
| --- | --- | --- | --- |
| 서버 응답 대기 | - | - | - |
| 이미지 요청 시작까지 대기 | - | - | - |
| 이미지 전송 | - | - | - |
| 화면에 그려질 때까지 | - | - | - |
| **LCP 합계** | - | - | |

**이미지 변경 내역**

| | Before | After |
| --- | --- | --- |
| 요청 URL | `/images/week-07/hero-original.jpg` | - |
| 원본 해상도 | 3840×2160 | - |
| 전송 크기 | 약 7.5MB | - |
| 실제 표시 크기 | - | - |
| 포맷 | JPEG | - |

**판단**

| 항목 | 내용 |
| --- | --- |
| Hero의 시각적 크기·비율·주요 피사체·문구 유지 여부 | - |
| 이미지 요청 우선순위를 높였는가 / 높이지 않았다면 그 근거 | - |
| 렌더링 경계 선택 — 홈 데이터를 기다리는 `await` 위치와 `Suspense` 위치 | - |
| Header·`h1`·페이지 설명이 느린 Hero와 함께 막히지 않았는지 확인 결과 | - |
| Hero fallback의 공간 예약 방식과 Layout shifts track 확인 결과 | - |

> `next/image` 사용 여부가 아니라 실제 요청 URL·전송 크기·waterfall·LCP 변화로 판단한다.

---

## 2️⃣ 최초 pending · 목록 갱신 · CLS

slow API의 1.5초 지연은 그대로 둔다.

| 상태 | 사용자에게 보여야 할 것 | 이번 구현에서 보여준 화면 | 대응하는 Query 상태 |
| --- | --- | --- | --- |
| 데이터 없는 최초 진입 | 실제 목록 크기를 예상할 수 있는 pending UI | - | - |
| 이전 데이터가 있는 갱신 | 기존 목록을 비우지 않고 갱신 중임을 표시 | - | - |
| 성공 + 0건 | 현재 URL 조건과 결과 0건임을 명시 | - | - |
| 최초 실패 | 목록 대신 실패 이유와 다시 시도할 방법 | - | - |
| 갱신 실패 | 기존 목록을 유지한 채 갱신 실패와 재시도 | - | - |
| 취소 | 오류로 보이거나 현재 화면을 덮지 않음 | - | - |

**URL ↔ 화면 정합성**

| 항목 | 내용 |
| --- | --- |
| query key와 실제 GET 요청에 함께 넣은 URL 조건 | - |
| 빠른 연속 변경 후 마지막 URL의 active query와 화면 일치 확인 | - |
| 이전 요청의 늦은 완료가 현재 화면을 덮지 않음을 확인한 방법 | - |
| 서버 응답을 Zustand·로컬 상태에 복사하지 않았음 | - |

**전환 전략 선택**

| 전략 | 적용 여부 | 근거 (적용 / 무개입 모두 기록) |
| --- | --- | --- |
| `placeholderData` | - | - |
| prefetch | - | - |
| `AbortSignal` | - | - |
| server prefetch + hydration | - | - |

**CLS** — fallback과 실제 콘텐츠 교체 시점의 Layout shifts track 확인 결과: -

---

## 3️⃣ 동적 metadata와 Open Graph

**합성 구조**

| 항목 | 내용 |
| --- | --- |
| 루트 `src/app/layout.tsx`의 title template·공통 `openGraph` | - |
| `src/app/(commerce)/page.tsx`의 `generateMetadata` 확인 내용 | - |
| `src/app/(commerce)/products/page.tsx`의 `generateMetadata` 확인 내용 | - |
| shallow merge에서 `siteName`·`locale`·`type`을 유지한 방법 | - |

**title·description 규칙**

| 조건 | 반영 위치 | 구현 내용 |
| --- | --- | --- |
| 검색어 | title에 먼저 반영 | - |
| category · sort | description에 반영 | - |
| 2페이지 이상 | title에 페이지 번호 반영 | - |

**데이터 소스 일치**

| 페이지 | metadata에 쓰는 응답 필드 | 구현 내용 |
| --- | --- | --- |
| 홈 | 응답의 title · description · image | - |
| 상품 목록 | 정규화한 URL 조건 + 응답의 카테고리명 · 전체 개수 · 첫 상품 이미지 | - |

| 항목 | 내용 |
| --- | --- |
| metadata와 본문이 같은 URL 정규화·query factory·GET URL·options를 쓰는 지점 | - |
| 서버 `getQueryClient()`가 호출마다 새 인스턴스를 만드는지 | - |
| request 범위 native fetch memoization의 적용 범위 | - |

**재현과 증거**

| 상황 | 확인한 증거 | 결과 |
| --- | --- | --- |
| normal | production document 응답 + 초기 HTML (title · description · Open Graph · 하나의 `h1` · 페이지 설명 · 주요 링크) | - |
| 정상 empty (성공 + 0건) | URL 조건, 0건을 설명하는 title·description, Open Graph fallback image 유지 | - |
| metadata query failure | `APP_ORIGIN`을 닿지 않는 origin으로 두고 build·runtime 동일 실행 → root 공통 metadata 상속 여부 | - |
| 기본 색인 가능 상태 (`robots: noindex` 없음) | - | - |

```bash
APP_ORIGIN=http://127.0.0.1:9 pnpm build
APP_ORIGIN=http://127.0.0.1:9 pnpm start
```

**서버 호출 계수**

| 항목 | 내용 |
| --- | --- |
| 계수 방법 (Browser Network 아님) | - |
| 동일 slow Route Handler 호출 횟수 — 홈 | - |
| 동일 slow Route Handler 호출 횟수 — 목록 | - |
| 임시 계측 제거 확인 | - |

**document / RSC 경계와 최종 URL**

| 항목 | 내용 |
| --- | --- |
| Network에서 확인한 document 요청과 RSC 요청 | - |
| 최종 URL과 metadata에 반영된 URL 조건 대조 | - |

**초기 HTML 확인 방법** — document Response / View Source / JavaScript 끈 새 요청 중: -

**응답 시점 비교 (일반 UA vs `facebookexternalhit`)**

```bash
curl -s -o /dev/null -w 'normal start=%{time_starttransfer} total=%{time_total}\n' "$APP_ORIGIN/products"
curl -A 'facebookexternalhit/1.1' -s -o /dev/null -w 'facebook start=%{time_starttransfer} total=%{time_total}\n' "$APP_ORIGIN/products"
```

| UA | `time_starttransfer` | `time_total` |
| --- | --- | --- |
| 일반 document | - | - |
| `facebookexternalhit` | - | - |

해석 및 metadata가 데이터를 기다린 비용에 대한 판단: -

**접근성 최소 회귀**

| 항목 | 내용 |
| --- | --- |
| 주요 콘텐츠·탐색·상품 영역의 역할이 드러나는 마크업 | - |
| 주요 이동이 `href` 링크인지 | - |
| 의미 있는 이미지의 대체 텍스트 | - |

---

## 4️⃣ After — 재측정 상세와 회귀 확인

**같은 조건 5회 재측정 raw 값** (최종 비교 결과는 PR 참고)

| 지표 | 1 | 2 | 3 | 4 | 5 | 중앙값 | 최소 | 최대 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCP | - | - | - | - | - | - | - | - |
| LCP | - | - | - | - | - | - | - | - |
| CLS | - | - | - | - | - | - | - | - |

**기능 회귀**

| 확인 항목 | 결과 |
| --- | --- |
| 목록 최초 진입·갱신 화면 재녹화 (0단계와 같은 행동) | - |
| 검색·카테고리·정렬·페이지가 URL에서 복원 | - |
| 뒤로 가기 / 앞으로 가기가 같은 화면 복원 | - |
| 장바구니·위시리스트 토글, Header 개수 일치 | - |
| 로딩·에러·빈 상태·재시도 | - |
| 이미지 품질 (Hero 시각적 크기·비율·피사체) | - |
| FSD 의존 방향·슬라이스 Public API 우회 없음 | - |
| `pnpm test` / `pnpm check` | - |

**효과가 없었거나 악화된 변경**

| 변경 | 관찰한 결과 | 되돌림 / 유지 (유지 시 근거) |
| --- | --- | --- |
| - | - | - |

---

## ⚡ Advanced A — 관계없는 카드 렌더 줄이기

> Basic 완료 후 선택. 미선택 시 이 섹션 삭제.

**측정 조건**: `/performance-lab/inp?pageSize=24`, 이미지 로딩 완료 후, 일반 production build, CPU `4x slowdown`, 같은 상품이 찜되지 않은 상태에서 같은 찜 버튼 1회 클릭, Before·After 각 3회.

| Interaction 구간 | 1 | 2 | 3 | Before 중앙값 | After 1 | After 2 | After 3 | After 중앙값 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| input delay | - | - | - | - | - | - | - | - |
| processing duration | - | - | - | - | - | - | - | - |
| presentation delay | - | - | - | - | - | - | - | - |

**React Profiler** (`pnpm next build --profile`)

| 항목 | Before | After |
| --- | --- | --- |
| 렌더된 카드 수 | - | - |
| 렌더 원인 | - | - |
| 적용한 가장 작은 변경 | - | - |

| 확인 항목 | 결과 |
| --- | --- |
| Basic(0~4단계)을 먼저 완료했는가 | - |
| 카드 24개 · 필수 계산 · 즉각적인 찜 피드백 유지 | - |
| Performance는 클릭 구간, Profiler는 렌더 범위로 용도를 나눠 사용 | - |
