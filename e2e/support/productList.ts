import { expect, type Page } from '@playwright/test';

export async function captureListState(page: Page) {
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

export async function openProductList(page: Page) {
  await page.goto('/products');
  await expect(page.getByRole('region', { name: '상품 검색 결과' })).toHaveAttribute('aria-busy', 'false');
}
