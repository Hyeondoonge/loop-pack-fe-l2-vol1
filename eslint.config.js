import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    // eslint/js recommded + typescript-eslint recommended
    // 서로 상호보완적인 규칙
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      'react-hooks': reactHooks
    },
    languageOptions: {
      // tseslint custom rule 추가를 위한 tsconfig 경로 명시
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // React 의 기대 코드 흐름인 "컴포넌트가 렌더링될 때마다 정확히 동일한 훅이 정확히 동일한 순서로 호출" 과 일치시키기 위함
      'react-hooks/rules-of-hooks': 'error',
      // 의도적으로 남기는 케이스가 있기 때문에 권장사항에 따라 warn
      // 단, 'stale closure' 문제에 유의해서 스스로 코드 변경 필요성을 판단해야함
      'react-hooks/exhaustive-deps': 'warn',
      // 비동기 함수 예외 대응
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      // 의미없는 이름 금지, 코드 수정 빈번할 경우 고려하여 warn
      'id-denylist': ['warn', 'data', 'temp', 'tmp', 'flag', 'val', 'foo', 'bar', 'err'],
      // 1글자 식별자 금지(warn). for 카운터 관례(i·j·k)와 throwaway(_)는 허용.
      // no-restricted-syntax와 다르게 콜백 파라미터(map(x =>))도 포함하여 더 넓게 잡음
      'id-length': ['warn', { min: 2, exceptions: ['i', 'j', 'k', '_'] }],
      // 핸들러 네이밍 — onXXX는 props 전달용으로 예약, 선언하는 핸들러는 handleXXX
      // 쉽게 지킬 수 있는 규칙이므로 error로 지정
      // 핸들러 네이밍 — onXXX는 props 전달용으로 예약, 선언하는 핸들러는 handleXXX
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
  }
);
