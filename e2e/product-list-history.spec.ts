import { expect, test } from '@playwright/test';
import { captureListState, openProductList } from './support/productList';

test('필터를 두 번 바꾼 뒤 뒤로 가면 직전 조건의 화면과 주소로 돌아오고, 앞으로 가면 최신 조건으로 돌아온다', async ({ page }) => {
  await openProductList(page);

  // stack history
  await page.getByLabel('카테고리').selectOption('casual');
  const previousConditionState = await captureListState(page);

  await page.getByLabel('정렬').selectOption('price-desc');
  const latestConditionState = await captureListState(page);

  await page.goBack();
  expect(await captureListState(page)).toEqual(previousConditionState);

  await page.goForward();
  expect(await captureListState(page)).toEqual(latestConditionState);
});
