import { expect, Page, test } from '@playwright/test';
import { blockUnmockedApi, expectNoBlockingA11yViolations, TEST_DATA_LABEL, TOKEN_KEY } from './support';

const LOGIN_API = '**/rest/login';
const LOGIN_PATH = '/auth/login';
const LOGIN_URL = new RegExp(`${LOGIN_PATH}$`);

async function openLogin(page: Page): Promise<void> {
  await blockUnmockedApi(page);
  await page.goto(LOGIN_PATH);
  await expect(page.locator('#btn-login')).toBeVisible();
}

async function submitCredentials(page: Page, email: string, password: string): Promise<void> {
  await page.locator('#frm-itm-email').fill(email);
  await page.locator('#frm-itm-password').fill(password);
  await page.locator('#btn-login').click();
}

test.describe('Màn đăng nhập', () => {
  test('hiển thị tiêu đề, ô email, ô mật khẩu và nút đăng nhập', async ({ page }) => {
    await openLogin(page);
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page.locator('#frm-itm-email')).toBeEditable();
    await expect(page.locator('#frm-itm-password')).toBeEditable();
    await expect(page.locator('#btn-login')).toBeEnabled();
  });

  test('không có vi phạm tiếp cận mức serious/critical (axe)', async ({ page }) => {
    await openLogin(page);
    await expectNoBlockingA11yViolations(page);
  });

  test('gửi form trống: báo thiếu tên đăng nhập và mật khẩu, không gọi API', async ({ page }) => {
    let apiCalls = 0;
    await blockUnmockedApi(page);
    await page.route(LOGIN_API, route => {
      apiCalls += 1;
      return route.abort('blockedbyclient');
    });
    await page.goto(LOGIN_PATH);
    await page.locator('#btn-login').click();
    await expect(page.getByText('Vui lòng nhập Tên đăng nhập')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập Mật khẩu')).toBeVisible();
    expect(apiCalls).toBe(0);
  });

  test('sai thông tin (API trả 401): báo lỗi, ở lại trang đăng nhập, không lưu phiên', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Sai thông tin (${TEST_DATA_LABEL})` }),
    }));

    await submitCredentials(page, 'nguoi.thu.nghiem@example.org', 'mat-khau-sai');

    await expect(page.locator('.toast-error')).toContainText('Tài khoản không có quyền truy cập');
    await expect(page).toHaveURL(LOGIN_URL);
    expect(await page.evaluate(key => localStorage.getItem(key), TOKEN_KEY)).toBeNull();
  });

  test('không đủ quyền (API trả 403): báo lỗi quyền, ở lại trang đăng nhập', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Không đủ quyền (${TEST_DATA_LABEL})` }),
    }));

    await submitCredentials(page, 'nguoi.thu.nghiem@example.org', 'mat-khau-gia');

    await expect(page.locator('.toast-error')).toContainText('Tài khoản không có quyền truy cập');
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('lỗi máy chủ 500: hiển thị thông điệp của máy chủ, không lộ chi tiết nội bộ', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Hệ thống đang bận, vui lòng thử lại sau' }),
    }));

    await submitCredentials(page, 'nguoi.thu.nghiem@example.org', 'mat-khau-gia');

    const toast = page.locator('.toast-error');
    await expect(toast).toContainText('Hệ thống đang bận');
    await expect(toast).not.toContainText('Exception');
  });

  test('đăng nhập thành công (dữ liệu giả): lưu phiên và rời trang đăng nhập', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'token-gia-khong-co-gia-tri',
        fullName: `Người dùng ${TEST_DATA_LABEL}`,
        avatar: '',
        expired: 4_102_444_800,
        roles: ['ROLE_STUDENT'],
      }),
    }));

    await submitCredentials(page, 'nguoi.thu.nghiem@example.org', 'mat-khau-gia');

    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(await page.evaluate(key => localStorage.getItem(key), TOKEN_KEY)).toBe('token-gia-khong-co-gia-tri');
  });
});
