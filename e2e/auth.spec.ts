import { expect, test } from './fixtures';

// "아직 담기지 않은 상품"을 고르는 조건이 aria-pressed라 role/name만으로는 못 잡는다.
// e2e/cart-across-routes.spec.ts:6과 같은 이유로 CSS 속성 셀렉터를 쓴다.
function firstUncartedButton(page: import('@playwright/test').Page) {
  return page.locator('button[aria-label$="장바구니"][aria-pressed="false"]').first();
}

function nextPathname(url: URL): string {
  const next = url.searchParams.get('next');
  if (next === null) throw new Error('next 파라미터가 없다');
  return new URL(next, url.origin).pathname;
}

test.describe('로그인 검증 자체는 로그인 상태로 시작하지 않는다', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('미로그인으로 담고 주문서로 가면, 로그인 후 그 화면으로 돌아오고 담은 상품이 그대로 있다', async ({ page }) => {
    await page.goto('/');

    const cartButton = firstUncartedButton(page);
    const ariaLabel = await cartButton.getAttribute('aria-label');
    if (ariaLabel === null) throw new Error('담기 버튼에 aria-label이 없다');
    const productLabel = ariaLabel.replace(/ 장바구니$/, '');
    await cartButton.click();

    await page.getByRole('link', { name: '장바구니' }).click();
    await page.getByRole('link', { name: '주문하기' }).click();

    // 가드가 로그인으로 보내고 next에 원래 경로를 싣는다. proxy.ts는 next를 절대 URL로
    // 만든다(01-auth-guard-design.md 5번 결정) — 인코딩 형태를 그대로 단언하지 않고 파싱해서 본다.
    await expect(page).toHaveURL(/\/login\?next=/);
    expect(nextPathname(new URL(page.url()))).toBe('/orders/new');

    await page.getByLabel('이메일').fill('looper1@loopers.dev');
    await page.getByLabel('비밀번호').fill('looper1234');
    await page.getByRole('button', { name: '로그인' }).click();

    // 원래 가려던 경로로 돌아온다
    await expect(page).toHaveURL('/orders/new');
    // 복원된 주문서에 담은 상품이 남아 있다 — 소프트 내비게이션 경로에서 장바구니가 살아 있어야 성립
    await expect(page.getByText(productLabel)).toBeVisible();
  });

  test('잘못된 비밀번호로 로그인하면 에러가 표시되고 화면에 남는다', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('looper1@loopers.dev');
    await page.getByLabel('비밀번호').fill('wrong-password');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('로그아웃 후 계정 데이터가 정리된다', () => {
  // storageState를 비우지 않는다 — 이 테스트는 로그인 흐름을 검증 대상으로 삼지 않으므로
  // fixtures.ts의 기본값(workerStorageState)을 그대로 써서 이미 로그인된 상태로 시작한다.
  test('주문 내역 화면에서 로그아웃하면 화면에 남아있던 주문이 사라진다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible();

    const cartButton = firstUncartedButton(page);
    await cartButton.click();
    await page.getByRole('link', { name: '장바구니' }).click();
    await page.getByRole('link', { name: '주문하기' }).click();
    await expect(page).toHaveURL('/orders/new');
    await page.getByRole('button', { name: /주문하기$/ }).click();
    await expect(page).toHaveURL('/orders');
    await expect(page.locator('.order-card').first()).toBeVisible();

    // 주문 내역 화면에 머문 채 로그아웃한다.
    await page.getByRole('button', { name: '로그아웃' }).click();

    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
    await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0);
    await expect(page).toHaveURL('/');
  });
});

test.describe('계정을 바꿔 로그인하면 이전 계정의 주문이 보이지 않는다', () => {
  // 두 계정을 직접 지정해야 하므로 워커 계정(fixtures.ts 기본값)을 쓰지 않고 미로그인으로 시작한다.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('계정 A로 주문 내역을 본 뒤 계정 B로 로그인하면 A의 주문번호가 화면에 없다', async ({ page }) => {
    // --- 계정 A: 주문을 하나 만들고 주문 내역까지 본다 ---
    await page.goto('/login');
    await page.getByLabel('이메일').fill('looper1@loopers.dev');
    await page.getByLabel('비밀번호').fill('looper1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL('/');

    await firstUncartedButton(page).click();
    await page.getByRole('link', { name: '장바구니' }).click();
    await page.getByRole('link', { name: '주문하기' }).click();
    await expect(page).toHaveURL('/orders/new');
    await page.getByRole('button', { name: /주문하기$/ }).click();
    await expect(page).toHaveURL('/orders');

    // 최근 주문이 맨 위에 온다(OrderHistorySection). 방금 만든 A의 주문번호를 기억해 둔다 —
    // 목록이 비었는지가 아니라 "A의 그 주문"이 B에게 보이는지를 봐야 하기 때문이다.
    // B에게 자기 주문이 있어도 이 단언은 그대로 성립한다.
    const orderNumberOfA = await page
      .getByText(/^주문번호 /)
      .first()
      .textContent();
    if (orderNumberOfA === null) throw new Error('A의 주문번호를 읽지 못했다');

    // --- 계정 B로 갈아탄다 ---
    await page.getByRole('button', { name: '로그아웃' }).click();
    await page.getByRole('link', { name: '로그인' }).click();

    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('이메일').fill('looper2@loopers.dev');
    await page.getByLabel('비밀번호').fill('looper1234');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByRole('link', { name: /마이페이지$/ })).toBeVisible();

    let releaseOrders: () => void = () => {};
    const ordersHeld = new Promise<void>((resolve) => {
      releaseOrders = () => resolve();
    });
    await page.route('**/api/orders', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await ordersHeld;
      await route.continue();
    });

    await page.getByRole('link', { name: /마이페이지$/ }).click();
    await page.getByRole('link', { name: '주문 내역 보러 가기' }).click();
    await expect(page).toHaveURL('/orders');

    // 조회 중인 동안 A의 주문이 B의 화면에 있으면 안 된다.
    await expect(page.getByText(orderNumberOfA, { exact: true })).toHaveCount(0);
    await expect(page.locator('.order-card-skeleton')).toBeVisible();

    // 응답을 풀어 최종 상태까지 확인한다.
    releaseOrders();
    await expect(page.locator('.order-card-skeleton')).toHaveCount(0);
    await expect(page.getByText(orderNumberOfA, { exact: true })).toHaveCount(0);
  });
});

test('세션이 만료되면 보호 경로에서 로그인 화면으로 안내된다', async ({ page, context }) => {
  // 만료를 시간으로 재현하지 않는다(과제 42번 줄). GET /api/auth/me · /api/orders에
  // 항상 401을 주는 시나리오 쿠키를 심는다. 쿼리로는 못 붙인다 — 앱 내부 호출이라(과제 59번 줄).
  //
  // /mypage가 아니라 /orders를 쓴다 — /api/auth/me의 401은 "미로그인"으로 번역돼 null을
  // 반환하고 전역 처리에 도달하지 않는다. SessionExpiredError는 /api/orders 계열에서만  던져진다
  await context.addCookies([{ name: 'scenario', value: 'expired', url: 'http://localhost:3000' }]);

  await page.goto('/orders');

  await expect(page.getByRole('status')).toHaveText('세션이 끊어졌어요. 다시 로그인해 주세요.');
  const loginUrl = new URL(page.url());
  expect(loginUrl.pathname).toBe('/login');
  expect(loginUrl.searchParams.get('reason')).toBe('expired');
  expect(nextPathname(loginUrl)).toBe('/orders');
});
