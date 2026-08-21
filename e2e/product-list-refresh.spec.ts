import { expect, test, type Page } from '@playwright/test';

// 새로고침 전후를 비교하는 방식이라 시드 값을 테스트에 박지 않는다. 시드가 늘거나 바뀌어도
// "새로고침해도 같은 화면"이라는 성질은 그대로 유지된다.
async function captureListState(page: Page) {
  const results = page.getByRole('region', { name: '상품 검색 결과' });
  await expect(results).toHaveAttribute('aria-busy', 'false');

  return {
    search: new URL(page.url()).search,
    category: await page.getByLabel('카테고리').inputValue(),
    sort: await page.getByLabel('정렬').inputValue(),
    keyword: await page.getByRole('textbox', { name: '검색' }).inputValue(),
    results: await results.innerText()
  };
}

async function openProductList(page: Page) {
  await page.goto('/products');
  await expect(page.getByRole('region', { name: '상품 검색 결과' })).toHaveAttribute('aria-busy', 'false');
}

test('필터를 바꾼 뒤 새로고침해도 화면 필터와 목록이 그대로다', async ({ page }) => {
  await openProductList(page);

  await page.getByLabel('카테고리').selectOption('casual');
  await page.getByLabel('정렬').selectOption('price-asc');

  const before = await captureListState(page);
  await page.reload();

  expect(await captureListState(page)).toEqual(before);
});

test('검색어와 카테고리와 정렬을 함께 건 상태에서도 새로고침 후 그대로다', async ({ page }) => {
  await openProductList(page);

  await page.getByRole('textbox', { name: '검색' }).fill('니트');
  await page.getByRole('button', { name: '검색' }).click();
  await page.getByLabel('카테고리').selectOption('fashion');
  await page.getByLabel('정렬').selectOption('price-desc');

  const before = await captureListState(page);
  expect(before.keyword).toBe('니트');
  expect(before.category).toBe('fashion');

  await page.reload();

  expect(await captureListState(page)).toEqual(before);
});

test('페이지를 넘긴 상태에서 새로고침해도 같은 페이지에 머문다', async ({ page }) => {
  await openProductList(page);

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByText('2 /', { exact: false })).toBeVisible();
  // 화면과 주소가 같은 페이지를 가리키는지 먼저 못 박는다. 새로고침 전후 비교만으로는 주소 표기가
  // 통째로 어긋나도 양쪽이 같으면 통과한다.
  await expect(page).toHaveURL(/[?&]page=2(&|$)/);

  const before = await captureListState(page);
  await page.reload();

  expect(await captureListState(page)).toEqual(before);
});
