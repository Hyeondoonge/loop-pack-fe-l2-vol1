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
