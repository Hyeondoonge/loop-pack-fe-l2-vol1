# 프로젝트 작업 지침

React 19 + TypeScript + Vite 학습용 레포. 전역 기본 스택(Vue)이 아니라 **React**다.

## 기술 스택 및 버전

- 런타임/UI: React 19 (`react`, `react-dom`)
- 언어: TypeScript ~6.0 (strict, `tsconfig.app.json` 기준)
- 빌드: Vite 8
- 패키지 매니저: **pnpm** (npm/yarn 사용 금지)
- 품질 도구: ESLint 10 + typescript-eslint 8, Prettier 3.8, Husky + lint-staged
- 의존성은 임의로 추가/업그레이드하지 않는다. 필요 시 먼저 제안한다.

## 컴포넌트 작성 규칙

- 함수형 컴포넌트 + Hooks만 사용. 클래스 컴포넌트 금지.
- Hooks 규칙은 `eslint-plugin-react-hooks`가 강제한다(`rules-of-hooks: error`, `exhaustive-deps: warn`). warn도 무시하지 말 것.
- 컴포넌트 파일/함수명은 PascalCase, 1파일 1주요 컴포넌트.
- props 타입은 명시적으로 선언한다. 불필요한 곳은 추론에 위임.
- 타입 단언(`as`) 지양 → 타입 가드·제네릭·정확한 타입 정의 사용. `any` 대신 `unknown` 후 좁히기.
- `verbatimModuleSyntax`가 켜져 있으므로 타입 전용 import는 `import type`으로 분리한다.
- 사용하지 않는 변수/파라미터는 빌드를 깨뜨린다(`noUnusedLocals/Parameters`). 남기지 말 것.
- 포맷팅·스타일 세부 규칙은 `.prettierrc.json`·`eslint.config.js`가 단일 출처다. 여기서 중복 서술하지 않는다.

## 코드 리뷰 규칙

리뷰/작업 완료 전 점검:

- [ ] `pnpm lint`, `pnpm build`(= `tsc -b && vite build`) 통과
- [ ] 변경 범위가 요청 범위를 벗어나지 않음 (요청한 것만 구현)
- [ ] Hooks 의존성 배열·조건부 호출 위반 없음
- [ ] 타입 단언/`any` 도입 없음, 새 의존성 무단 추가 없음
