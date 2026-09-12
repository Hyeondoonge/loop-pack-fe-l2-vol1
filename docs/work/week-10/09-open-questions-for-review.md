# 피드백 요청 목록 — 애매하게 결정한 것들

- 대상: `docs/work/week-10/01`~`08` 결정 문서에서 **근거가 한쪽으로 확실히 기울지 않은 채 결론을 낸 항목**
- 목적: 멘토·리뷰어에게 물어볼 것을 골라 두는 것. 여기서 새로 결정하지 않는다
- 작성: 2026-09-12, HEAD `40ec14c` 기준. C절은 문서 작성 이후 커밋(`a53757a`~`cb22670`)으로 생긴 문서-구현 차이다
- 각 항목 형식: **정한 것 / 애매한 지점 / 물어볼 것**

## 먼저 물어볼 5개

| 순위 | 항목 | 한 줄 |
| --- | --- | --- |
| 1 | [A-2](#a-2-smoke-판정-수준-c가-원래-잡으려던-실패를-못-잡는다) | smoke가 "서버 self-fetch 실패"를 통과시킨다 — 문서도 인정하는데 수준을 올리지 않았다 |
| 2 | [A-1](#a-1-preview-self-fetch-방식--안정성-축-하나로-정확성-축을-뒤집었다) | Preview self-fetch를 보안 축 하나로 골랐는데, Preview가 Production과 다른 렌더 경로를 타게 됐다 |
| 3 | [A-3](#a-3-main-pr은-ci를-돌리면서-차단은-하지-않는다) | main PR에서 CI를 돌리면서 차단은 안 한다 — "정보가 없다"는 근거와 워크플로가 어긋난다 |
| 4 | [B-1](#b-1-폴백을-없앤다는-원칙과-smoke의-조용한-폴백) | `폴백을 없앤다`(01 7절) 원칙을 세워 놓고 smoke에는 조용한 폴백을 뒀다 |
| 5 | [A-6](#a-6-docker-이미지-11gb--output-standalone-검토-기록이-없다) | 이미지 1.1GB인데 `output: 'standalone'` 검토 기록이 어디에도 없다 |

---

## A. 설계 판단이 갈릴 수 있는 것

### A-1. Preview self-fetch 방식 — 안정성 축 하나로 정확성 축을 뒤집었다

- 출처: `07` 5·6절
- 정한 것: bypass 헤더가 아니라 **요청 origin + 방문자 쿠키**. 세 축 비교에서 변경 비용은 비슷, 정확성은 bypass가 앞섰고, 안정성(비밀키 유출) 하나로 결정했다.
- 애매한 지점
  - 감수한 것이 "방문자에게 그 URL의 Vercel 인증 쿠키가 없으면 서버 prefetch가 실패한다"인데, 이건 **Preview에서만 Production과 다른 렌더 경로가 된다**는 뜻이다. Preview를 두는 이유가 Production을 미리 재현하는 것이라면 목적과 직접 부딪친다.
  - 유출 위험의 크기를 재지 않았다. 이 앱의 백엔드는 `app/api/_data`의 mock이고 세션 서명 기본값은 이미 공개돼 있다(`07` 4-1). 그 상태에서 "secret이 앱 코드에 들어오지 않는다"가 정확성·환경 동등성 두 축을 이길 만큼 무거운가.
  - 같은 이유로 4-1(Preview 보호 해제)이 과소평가된 것 아닌가. 저장소가 public이고 `vercel[bot]`이 URL을 PR에 남기므로 URL은 사실상 공개인데도 "보호 유지"를 먼저 고정하고 그 안에서 선택했다.
- 물어볼 것
  - 실제 백엔드·실제 사용자 데이터가 없는 단계에서, 축 가중치를 이렇게 두는 게 맞나?
  - 현업에서 Preview 보호를 끄는 판단은 어떤 조건에서 내리나? 끄지 않는다면 "Preview는 인증된 방문자에게만 SSR이 정상"이라는 상태를 정상으로 받아들이나?

### A-2. smoke 판정 수준 C가 원래 잡으려던 실패를 못 잡는다

- 출처: `06` 2·3절, `07` 8절
- 정한 것: 판정 수준을 **C(데이터가 화면에 존재하는지)**로 올렸다. 근거는 "환경 변수 → `getAppOrigin()` → `apiFetch` → API 응답 경로 전체를 한 번에 지난다"였다.
- 애매한 지점
  - `07` 8절이 스스로 적었다 — *"smoke 통과는 CI가 보호된 Preview에 들어간다는 증거다. 서버 prefetch 성공의 증거는 아니다."* 서버 prefetch가 실패해도 브라우저가 같은 쿼리를 다시 받아 화면에는 데이터가 뜨기 때문이다.
  - 즉 `06` 2절이 "가장 치명적"이라고 지목한 실패(= `getAppOrigin()`이 틀려 서버 렌더 데이터가 전부 빈다)를 **판정 수준 C가 통과시킨다.** 실제로 수정 전 배포는 HTML 응답이 17초 걸리고 `<title>`이 기본값이었는데도 화면에는 데이터가 떴다(`07` 8절 실측).
  - 그런데 `06` 3절의 "A를 택하지 않는 이유"가 바로 이 시나리오였다. 논리대로라면 C는 A와 실질 강도가 같다.
- 물어볼 것
  - 판정 수준을 **서버가 만든 HTML 자체**를 보는 쪽으로 올려야 하나? 후보: ① JS 비활성 컨텍스트에서 응답 HTML에 데이터 존재 확인 ② 브라우저의 `/api/home` 재요청 0건 확인 ③ `<title>`이 서버 metadata 값인지 확인 — ③은 `07` 8절이 이미 판정에 쓴 지표다.
  - smoke가 "배포가 완전히 깨졌는지"만 봐야 한다면, 애초에 서버 렌더 실패는 smoke의 대상이 아닌가? 그렇다면 이 층은 무엇이 잡나.

### A-3. main PR은 CI를 돌리면서 차단은 하지 않는다

- 출처: `04` 5절, `03` 2·6절, `05` "아직 하지 않은 것", `.github/workflows/quality.yml`
- 정한 것: main에는 required를 두지 않는다. 근거는 "develop PR에서 통과한 동일 커밋이라 다시 실행해도 새로운 정보가 나오지 않는다".
- 애매한 지점
  - 워크플로는 `pull_request: branches: [develop, main]`, `push: branches: [develop, main]`이다. **새 정보가 없다면서 CI는 그대로 돌고 있다.** 정보가 없다면 트리거에서 main을 빼야 하고, 정보가 있다면 required로 걸어야 하는데 지금은 시간만 쓰고 차단은 안 하는 중간 상태다.
  - "동일 커밋" 전제도 느슨하다. develop에 PR이 여러 개 쌓인 뒤 main으로 올리면 main에 가는 트리는 각 PR이 검증한 트리가 아니다. 그 조합은 develop push CI가 보지만 그 결과가 빨간불이어도 main 머지를 막는 것은 없다.
  - `03` 6절은 `Require branches to be up to date`를 "실질적인 머지 직전 재검증"으로 설명하는데, `05`는 그 설정이 `false`라고 기록했다. 문서가 기대하는 재검증이 실제로는 없다.
  - `03` 5절은 "문서로만 남기는 쪽은 아무것도 차단하지 않으면서 차단되는 것처럼 보이게 만든다"며 기각했다. main 구간이 지금 그 형태 아닌가.
- 물어볼 것
  - 게이트를 develop 한 곳에만 두는 구조에서, develop→main은 무엇으로 보증하나? (`strict: true`로 최신화 강제 / main에도 required / main 트리거 제거 중 어느 쪽인가)
  - 단독 작업 저장소라 "사람이 본다"가 답이라면, 그건 `03` 5절이 기각한 논리와 같은 형태가 되는데 어디서 선을 긋나?

### A-4. E2E required의 근거가 "변동성 미관측"이다

- 출처: `04` 4-7
- 정한 것: 일반론상 변동성 높은 E2E를 required로 뒀다. 근거는 `retries: 0`으로 10개 전부 통과, 관측된 flaky 없음.
- 애매한 지점: 관측 표본이 작고, flaky의 부재는 증명하기 어렵다. 문서는 "향후 간헐 실패가 관측되면 재검토한다"까지만 적었는데, **재검토 시점의 행동 규칙이 없다.** flaky가 처음 나왔을 때 통과시키려고 재실행할지, `retries: 1`을 넣을지, 그 spec을 required에서 뺄지가 정해져 있지 않으면 그 순간 가장 편한 선택을 하게 된다.
- 물어볼 것: required E2E에서 첫 flaky를 만났을 때의 표준 대응은 무엇인가? `retries`를 0으로 유지하는 것이 신호를 지키는 방법인가, 아니면 1을 허용하고 flaky를 리포트로 따로 추적하는 쪽이 현업 관행인가?

### A-5. lint warning 32건을 통과시키는 상태를 유지한다

- 출처: `04` 4-2
- 정한 것: error 0건만 실패로 본다. warning 32건은 통과.
- 애매한 지점: 같은 절이 *"경고를 통과시키는 상태가 길어지면 게이트가 서서히 무의미해진다"*고 적고 **대책 없이 "별도 과제로 남긴다"로 끝냈다.** 남긴 것이 아니라 방치에 가깝다.
- 물어볼 것: 중간 형태로 `--max-warnings <현재값>` baseline을 걸어 증가만 막는 방식은 어떤가? 아니면 warn 규칙을 "error로 올릴 것"과 "끌 것"으로 이분하는 쪽이 나은가 — warn 심각도 자체를 남겨 두는 게 의미가 있나?

### A-6. Docker 이미지 1.1GB — `output: 'standalone'` 검토 기록이 없다

- 출처: `08`, `docs/rfc/week10-deployment-options.md`, `Dockerfile`, `next.config.ts`
- 정한 것: runtime 스테이지에서 `pnpm install --prod` 후 `pnpm start`. 이미지 1.1GB, 컨테이너 안 `node_modules` 496M, `.next` 14M.
- 애매한 지점
  - `next.config.ts`에 `output` 설정이 없고, `docs/` 전체에 `standalone`이라는 단어가 없다. **Next.js가 Docker 배포용으로 제시하는 기본 경로를 검토했다는 기록이 어디에도 없다.**
  - `08`이 "사실 기록만"이라 판단을 담지 않았고, rfc 6절의 결론은 Vercel/Docker 선택 조건만 다룬다. 그래서 이미지 구성 결정이 어느 문서에서도 근거를 갖지 않는다.
  - 496M 중 대부분이 실행에 필요 없는 것이라면 pull 시간·레지스트리 비용·공격 표면이 모두 그만큼 커진다.
- 물어볼 것: standalone을 쓰지 않은 것이 의도된 선택인가 미검토인가? 학습용 과제에서 이미지 크기를 어디까지 신경 쓰는 게 적절한가?

---

## B. 원칙끼리 부딪치는 것

### B-1. "폴백을 없앤다"는 원칙과 smoke의 조용한 폴백

- 출처: `01` 7절 ↔ `07` 6절, `playwright.smoke.config.ts`
- 부딪치는 지점
  - `01` 7절: *"조용히 틀린 값으로 진행하는 것보다 검증에서 죽는 편이 낫다."*
  - `playwright.smoke.config.ts`: bypass secret이 없으면 **헤더 없이 그대로 진행한다.** 보호된 Preview를 대상으로 secret이 빠지면 smoke는 로그인 HTML을 상대로 돌게 된다.
  - `07` 6절도 이 항목을 "사용자에게 두 차례 선택을 요청했으나 답이 없어 Claude가 기본값으로 적용 — **사용자 확정 필요**"로 남겼다. 즉 아직 결정이 아니다.
- 물어볼 것: 대상 호스트가 보호된 Preview인데 secret이 없으면 즉시 실패시키는 쪽이 `01` 7절과 일관되지 않나? 반대로 secret 없이도 "Production은 보호 대상이 아니므로 진행"이 맞다면, 그 구분을 코드에서 어떻게 드러내야 하나?

### B-2. 선제 방어를 어디까지 하는지 기준이 문서마다 다르다

- 출처: `01` 7·8절, `02` 2절, `scripts/validate-env.ts`
- 부딪치는 지점

| 결정 | 겪은 사고가 있었나 | 채택 |
| --- | --- | --- |
| `APP_ORIGIN` 폴백 제거 (`01` 7절) | 없음 | 도입 |
| URL 프로토콜 검사 (`02` 2절 3번) | 없음 | 도입 |
| `NEXT_PUBLIC_` 허용 목록 검증 (`validate-env.ts`) | 없음 | 도입 |
| 끝 슬래시 검사 (`02` 2절 4번) | **있음** | 도입 |
| `VERCEL_ENV` 교차검사 (`01` 8절) | 없음 | **기각 — "아직 겪지 않은 사고를 막는 코드다"** |

  - 기각 사유가 "겪지 않은 사고"라면 위 셋도 같은 이유로 기각됐어야 한다. 실제 기준은 다른 데 있는 것 같은데(실패가 조용한가? 되돌릴 수 있는가?) 명시돼 있지 않다.
  - `01` 8절이 막으려던 것(preview 스코프에 `production`을 잘못 넣는 오설정)도 조용히 틀린 값으로 진행하는 유형이라, 그 기준으로 보면 오히려 도입 쪽에 가깝다.
- 물어볼 것: "겪은 사고가 있어야 방어를 넣는다"와 "조용한 실패는 미리 막는다" 중 실무에서 어느 쪽이 기본값인가? 둘을 가르는 기준을 어떻게 말로 세우나?

### B-3. "Vercel 값에 결합하지 않는다"는 결정이 절반만 적용됐다

- 출처: `01` 1절 ↔ `01` 6절, `src/shared/config/appOrigin.ts`, `src/shared/api/apiFetch.ts`
- 부딪치는 지점: `01` 1절은 Docker 경로에 `VERCEL_ENV`가 없다는 이유로 Vercel 값을 환경 식별에서 배제했는데, 코드는 지금 **두 곳에서 `VERCEL_ENV === 'preview'`로 분기한다.** `01` 6절이 해명("값이 없으면 `APP_ORIGIN`으로 내려가므로 Docker가 정상 동작")을 달았지만, 그 해명은 "Vercel 값을 안 쓴다"가 아니라 "Vercel 값을 쓰되 없을 때 대비한다"다.
- 물어볼 것: **앱 환경 식별(`NEXT_PUBLIC_ENV`)**과 **플랫폼 실행 환경 감지(`VERCEL_ENV`)**를 다른 층으로 보는 게 맞나? 맞다면 그 경계를 어떻게 명문화해야 하나 — "브랜치 조건에만 쓰고 값의 출처로는 쓰지 않는다" 같은 형태면 충분한가?

### B-4. 환경별 규칙 분기를 안 한 근거가 이미 사실이 아니다

- 출처: `02` 3절
- 부딪치는 지점: 배포 환경에 https를 강제하지 않은 보강 근거가 "분기하려면 스크립트가 지금 어느 환경인지 알아야 하는데 알아낼 수단이 없다"였다. 그런데 B-3처럼 앱 코드는 이미 `VERCEL_ENV`로 Preview를 판별하고 있고, `validate-env.ts`도 같은 값을 읽을 수 있다. **제약이라고 적은 것이 실제 제약이 아니다.**
- 물어볼 것: Production에 `https` 강제를 넣어야 하나? 아니면 "검증 스크립트는 환경을 모르는 편이 낫다"는 것이 그 자체로 지킬 만한 원칙인가?

---

## C. 문서와 구현이 어긋난 것 (결정이 아니라 확인 요청)

`01`~`07` 작성 이후 커밋으로 생긴 차이다. 물어보기 전에 문서를 먼저 맞춰야 하는 항목.

| # | 문서 | 구현 | 비고 |
| --- | --- | --- | --- |
| C-1 | `02` 2절 "검사 항목 4개" | `scripts/validate-env.ts`에 **5번째 검사**(`NEXT_PUBLIC_` 허용 목록)가 있다 (`a53757a`, `319f3a7d`) | 이 검사를 넣은 결정 문서가 없다. `VERCEL_RESERVED_PUBLIC_ENV_PREFIX`를 통째로 예외 처리한 판단도 코드 주석에만 있다 |
| C-2 | `06` 9절·`07` 10절 "Preview smoke 자동 실행 미구현" | `smoke.yml`이 `vercel.deployment.success` + `if environment == 'preview'`로 **이미 자동 실행한다** (`cb22670`) | 미결 항목이 해소됐는데 문서에 반영 안 됨 |
| C-3 | `06` 8-1 "Production 도메인 고정. 배포별 고유 URL은 보호에 막혀 쓰지 않는다" | `smoke.yml`이 Preview에는 `client_payload.url`(배포별 고유 URL)을 쓴다 | bypass secret으로 해결된 것이라면 8-1의 근거가 바뀐 것인데 그 기록이 없다 |
| C-4 | `07` 10절 "smoke 호스트 판정은 `endsWith` 하나" | `smoke.yml`에 정규식 allowlist가 추가됐다. `playwright.smoke.config.ts`는 여전히 `endsWith` | 두 층의 판정 기준이 다르다. 어느 쪽이 실제 방어선인지 정해야 한다 |
| C-5 | `03` 6절 "`Require branches to be up to date`가 실질적 머지 직전 재검증" | `05`에 `strict: false`로 기록 | A-3과 같은 문제 |
| C-6 | `01` 4·6절 "소비처 두 곳이 모두 `getAppOrigin()`을 거친다" | Preview에서는 `apiFetch`가 요청 Host를 쓴다 | `07` 9절이 지적했으나 `01`은 아직 수정 안 됨 |
| C-7 | 전 문서의 근거 출처 `docs/assignments/week-10-quests.md`, `docs/mentor-notes/round10-*.md` | 두 경로 모두 레포에 없다(git 히스토리 포함). 현재 과제 문서는 `docs/assignments/week-10.md`이고 내용이 다르다 | 인용한 줄번호를 리뷰어가 검증할 수 없다. 로컬 전용 파일이라면 출처 표기를 바꿔야 한다 |

---

## D. 미결로 남긴 것 (피드백보다 결정이 먼저)

물어볼 대상이라기보다 아직 안 정한 것들이다. 기록만 모은다.

| 항목 | 출처 |
| --- | --- |
| `tsconfig.json`의 `erasableSyntaxOnly` 도입 여부 | `02` 6절 |
| `origin/Hyeondoonge` 브랜치 삭제 여부 | `03` 9절 |
| Vercel Preview 대상 브랜치 범위(전체인지 `develop`만인지) | `03` 9절 |
| 3 job 구성의 artifact 전송 시간 미측정 | `04` 6-1·8절 |
| Google Fonts 조치 — Docker 빌드가 성공했으므로(`08`) 보류 유지인지 재검토인지 | `04` 7절 ↔ `08` 2절 |
| Vercel Git Fork Protection 설정 확인 | `07` 10절 |
| Preview 분기에서 `headers()`가 클라이언트 컴포넌트 SSR 경로에도 동작하는지 실측 | `07` 10절 |
| `vercel.deployment.promoted`가 Instant Rollback 때도 오는지 | `06` 9절 |

## References

- 결정 문서: `docs/work/week-10/01`~`08`
- 코드·설정: `.github/workflows/quality.yml`, `.github/workflows/smoke.yml`, `scripts/validate-env.ts`, `playwright.smoke.config.ts`, `src/shared/api/apiFetch.ts`, `src/shared/config/appOrigin.ts`, `Dockerfile`, `next.config.ts`
- 제출 문서: `docs/rfc/week10-release-flow.md`, `docs/rfc/week10-deployment-options.md`, `docs/rfc/week10-retrospective.md`
- 실측: `git log --oneline`(`a53757a`·`319f3a7d`·`31128f40`·`cb22670`), `git log --all -- '*week-10-quests*'`(결과 없음)
