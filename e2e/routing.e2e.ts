import { expect, test } from '@playwright/test';
import { blockUnmockedApi, expectNoBlockingA11yViolations } from './support';

test.describe('Định tuyến cơ bản', () => {
  test('đường dẫn không tồn tại được đưa về trang chủ (không trắng trang)', async ({ page }) => {
    await blockUnmockedApi(page);
    await page.goto('/duong-dan-khong-ton-tai');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Hello!' })).toBeVisible();
  });

  test('trang chủ không có vi phạm tiếp cận mức serious/critical (axe)', async ({ page }) => {
    await blockUnmockedApi(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Hello!' })).toBeVisible();
    await expectNoBlockingA11yViolations(page);
  });
});
