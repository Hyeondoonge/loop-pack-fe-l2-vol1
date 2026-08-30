import { expect, test } from '@playwright/test';
import { captureListState, openProductList } from './support/productList';

test('필터를 바꾼 뒤 새로고침해도 화면 필터와 목록이 그대로다', async ({ page }) => {
  await openProductList(page);

  await page.getByLabel('카테고리').selectOption('casual');
  await page.getByLabel('정렬').selectOption('price-asc');

  const beforeReload = await captureListState(page);
  await page.reload();

  expect(await captureListState(page)).toEqual(beforeReload);
});

test('검색어와 카테고리와 정렬을 함께 건 상태에서도 새로고침 후 그대로다', async ({ page }) => {
  await openProductList(page);

  await page.getByRole('textbox', { name: '검색' }).fill('니트');
  await page.getByRole('button', { name: '검색' }).click();
  await page.getByLabel('카테고리').selectOption('fashion');
  await page.getByLabel('정렬').selectOption('price-desc');

  const beforeReload = await captureListState(page);

  await page.reload();

  expect(await captureListState(page)).toEqual(beforeReload);
});

test('페이지를 넘긴 상태에서 새로고침해도 같은 페이지에 머문다', async ({ page }) => {
  await openProductList(page);

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByText('2 /', { exact: false })).toBeVisible();

  const beforeReload = await captureListState(page);
  await page.reload();

  expect(await captureListState(page)).toEqual(beforeReload);
});
