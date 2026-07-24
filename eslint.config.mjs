import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  // next/image, next/font, next/script 오용(LCP 저해 등)을 warning이 아닌 error로 강제해 Core Web Vitals 저하를 빌드 단계에서 차단
  ...nextVitals,
  // typescript-eslint recommended 기반 타입 규칙 추가 — Next 자체 규칙(core-web-vitals)과 역할이 달라 별도 편입
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.claude/**'
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // React 의 기대 코드 흐름인 "컴포넌트가 렌더링될 때마다 정확히 동일한 훅이 정확히 동일한 순서로 호출" 과 일치시키기 위함
      'react-hooks/rules-of-hooks': 'error',
      // 의도적으로 남기는 케이스가 있기 때문에 권장사항에 따라 warn
      // 단, 'stale closure' 문제에 유의해서 스스로 코드 변경 필요성을 판단해야함
      'react-hooks/exhaustive-deps': 'warn',
      // 배열 index를 key로 쓰면 리스트 변경 시 잘못된 재사용·상태 꼬임 발생 — AI가 흔히 저지르는 실수
      // 단, 재정렬/삽입·삭제 없는 파생 배열 + 무상태 leaf 조합은 정당한 예외이므로 error 대신 warn
      'react/no-array-index-key': 'warn',
      // 렌더 함수 안에서 컴포넌트를 정의하면 매 렌더마다 재생성되어 unmount/remount — 결정적으로 잡히는 안티패턴
      'react/no-unstable-nested-components': 'error',
      // 타입 단언 전면 금지 — `value as X`와 꺾쇠 `<X>value` 둘 다 차단(as const는 예외). 단언으로 덮지 말고 타입 가드/제네릭으로 좁혀라
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      // non-null 단언(x!) 금지 — strictNullChecks가 잡은 null 위험을 ! 한 글자로 무력화하는 우회로 차단. if 가드로 좁혀라
      '@typescript-eslint/no-non-null-assertion': 'error',
      // 미사용 변수 금지 — 단, 언더바(_) 접두사는 '의도적으로 접근하지 않는 값' 표기로 예외 허용
      // (예: usePersistentState 반환 튜플에서 값은 안 쓰고 setter만 쓰는 write-only 훅)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      // == 의 암묵 타입 변환(0 == '', null == undefined 등) 비교 버그 차단 — 항상 ===/!== 강제
      eqeqeq: 'error',
      // 의미없는 이름 금지, 코드 수정 빈번할 경우 고려하여 warn
      'id-denylist': ['warn', 'data', 'temp', 'tmp', 'flag', 'val', 'foo', 'bar', 'err'],
      // 1글자 식별자 금지(warn). for 카운터 관례(i·j·k)와 throwaway(_)는 허용.
      // no-restricted-syntax와 다르게 콜백 파라미터(map(x =>))도 포함하여 더 넓게 잡음
      'id-length': ['warn', { min: 2, exceptions: ['i', 'j', 'k', '_'] }],
      // 핸들러 네이밍 — onXXX는 props 전달용으로 예약, 선언하는 핸들러는 handleXXX
      // 쉽게 지킬 수 있는 규칙이므로 error로 지정
      'no-restricted-syntax': [
        'error',
        {
          selector: 'VariableDeclarator[id.name=/^on[A-Z]/]',
          message: '핸들러 함수는 handleXXX로 명명하세요. onXXX는 props 전달용으로 예약되어 있습니다.'
        },
        {
          selector: 'FunctionDeclaration[id.name=/^on[A-Z]/]',
          message: '핸들러 함수는 handleXXX로 명명하세요. onXXX는 props 전달용으로 예약되어 있습니다.'
        }
      ]
    }
  },
  {
    // 타입 정보가 필요한 룰은 src 범위로만 한정. projectService로 타입 정보 제공.
    // ponytail: projectService=true면 tsconfig include 밖 파일도 자동 처리 — 옛 tsconfig.app/node.json 분리 불필요
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // 비동기 함수 예외 대응
      '@typescript-eslint/no-floating-promises': 'warn'
    }
  }
]);

export default eslintConfig;
