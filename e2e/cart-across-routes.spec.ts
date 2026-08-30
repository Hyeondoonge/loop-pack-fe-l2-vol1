import { expect, test, type Page } from '@playwright/test';

// 아직 담기지 않은 상품을 고른다. 홈과 목록에 같은 상품이 있으면 두 번째 클릭이 토글 해제가 되어
// 개수가 늘지 않는다.
function firstUncartedButton(page: Page) {
  return page.locator('button[aria-label$="장바구니"][aria-pressed="false"]').first();
}

function cartCount(page: Page) {
  return page.getByText(/^장바구니 \d+$/);
}

test('홈에서 담은 뒤 목록으로 이동해 하나 더 담으면 헤더 개수가 쌓인다', async ({ page }) => {
  await page.goto('/');
  await expect(cartCount(page)).toHaveText('장바구니 0');

  await firstUncartedButton(page).click();
  await expect(cartCount(page)).toHaveText('장바구니 1');

  // page.goto는 문서를 다시 받아 인메모리 스토어를 리셋한다. 실제 사용자 경로인 링크 클릭으로
  // 클라이언트 네비게이션을 태워야 라우트를 넘겨도 유지되는지 볼 수 있다(결정 10).
  await page.getByRole('link', { name: '상품' }).click();
  await expect(page).toHaveURL(/\/products/);

  // 이동만으로 개수가 초기화되지 않는다.
  await expect(cartCount(page)).toHaveText('장바구니 1');

  await expect(page.getByRole('region', { name: '상품 검색 결과' })).toHaveAttribute('aria-busy', 'false');
  await firstUncartedButton(page).click();

  await expect(cartCount(page)).toHaveText('장바구니 2');
});
