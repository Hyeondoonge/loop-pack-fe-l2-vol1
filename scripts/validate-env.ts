const APP_ORIGIN = process.env.APP_ORIGIN;

function fail(message: string): never {
  console.error(`[validate-env] ${message}`);
  process.exit(1);
}

if (!APP_ORIGIN) {
  fail('APP_ORIGIN이 설정되지 않았습니다.');
}

let url: URL;
try {
  url = new URL(APP_ORIGIN);
} catch {
  fail(`APP_ORIGIN이 올바른 URL이 아닙니다: ${APP_ORIGIN}`);
}

if (url.protocol !== 'http:' && url.protocol !== 'https:') {
  fail(`APP_ORIGIN의 프로토콜은 http 또는 https여야 합니다: ${APP_ORIGIN}`);
}

if (APP_ORIGIN.endsWith('/')) {
  fail(`APP_ORIGIN은 끝에 슬래시를 포함할 수 없습니다: ${APP_ORIGIN}`);
}

console.log(`[validate-env] APP_ORIGIN 검증 통과: ${APP_ORIGIN}`);

// NEXT_PUBLIC_ 값은 빌드 시점에 브라우저 번들에 인라인된다. 노출해도 되는 이름만 여기에 추가한다.
const ALLOWED_PUBLIC_ENV = new Set<string>([]);

// Vercel Next.js 빌더가 빌드마다 자동 주입하는 이름 (vercel/vercel packages/build-utils/src/get-prefixed-env-vars.ts)
const VERCEL_INJECTED_PUBLIC_ENV = new Set([
  'NEXT_PUBLIC_VERCEL_URL',
  'NEXT_PUBLIC_VERCEL_ENV',
  'NEXT_PUBLIC_VERCEL_TARGET_ENV',
  'NEXT_PUBLIC_VERCEL_REGION',
  'NEXT_PUBLIC_VERCEL_BRANCH_URL',
  'NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL',
  'NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID',
  'NEXT_PUBLIC_VERCEL_PROJECT_ID'
]);
const VERCEL_INJECTED_PUBLIC_ENV_PREFIX = 'NEXT_PUBLIC_VERCEL_GIT_';

const disallowedPublicEnv = Object.keys(process.env).filter((name) => name.startsWith('NEXT_PUBLIC_') && !ALLOWED_PUBLIC_ENV.has(name) && !VERCEL_INJECTED_PUBLIC_ENV.has(name) && !name.startsWith(VERCEL_INJECTED_PUBLIC_ENV_PREFIX));

if (disallowedPublicEnv.length > 0) {
  fail(`허용 목록에 없는 NEXT_PUBLIC_ 변수가 있습니다: ${disallowedPublicEnv.join(', ')}. 브라우저에 노출해도 되는 값만 ALLOWED_PUBLIC_ENV에 추가하세요.`);
}

console.log('[validate-env] NEXT_PUBLIC_ 허용 목록 검증 통과');
