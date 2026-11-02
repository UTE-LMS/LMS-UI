import { expect, Page, test } from '@playwright/test';
import { blockUnmockedApi, expectNoBlockingA11yViolations, TEST_DATA_LABEL, TOKEN_KEY } from './support';

/** Đường dẫn API đăng nhập F01 (API-CONTRACT.md §5.2.1). */
const LOGIN_API = '**/api/v1/auth/login';
const LOGIN_PATH = '/auth/login';
const LOGIN_URL = new RegExp(`${LOGIN_PATH}(\\?.*)?$`);
const SESSION_DATA_KEY = 'CURRENT_INFO_DATA';

/** Phản hồi lỗi chuẩn của backend (API-CONTRACT.md §2). */
function apiError(status: number, code: string, message: string, fieldErrors?: { field: string; message: string; }[]) {
  return JSON.stringify({
    timestamp: '2026-11-02T00:00:00Z', status, code, message, path: '/api/v1/auth/login',
    ...(fieldErrors ? { fieldErrors } : {}),
  });
}

/** DỮ LIỆU THỬ NGHIỆM: phản hồi đăng nhập giả với vai trò cho trước, không phải người dùng thật. */
function loginResponse(role: string): string {
  return JSON.stringify({
    accessToken: 'token-gia-khong-co-gia-tri',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: '0123456789abcdef01234567',
      username: 'nguoi.thu.nghiem',
      email: 'nguoi.thu.nghiem@example.org',
      fullName: `Người dùng ${TEST_DATA_LABEL}`,
      status: 'ACTIVE',
      roleAssignments: [{ role, scope: null }],
    },
  });
}

async function openLogin(page: Page): Promise<void> {
  await blockUnmockedApi(page);
  await page.goto(LOGIN_PATH);
  await expect(page.locator('#login-username')).toBeVisible();
}

async function submitCredentials(page: Page, username: string, password: string): Promise<void> {
  await page.locator('#login-username').fill(username);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
}

async function hasSession(page: Page): Promise<boolean> {
  return page.evaluate(
    keys => keys.some(key => localStorage.getItem(key) !== null),
    [TOKEN_KEY, SESSION_DATA_KEY],
  );
}

test.describe('Màn đăng nhập (F01)', () => {
  test('hiển thị tiêu đề, ô tên đăng nhập, ô mật khẩu và nút đăng nhập', async ({ page }) => {
    await openLogin(page);
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page.locator('#login-username')).toBeEditable();
    await expect(page.locator('#login-password')).toBeEditable();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });

  test('không có vi phạm tiếp cận mức serious/critical (axe)', async ({ page }) => {
    await openLogin(page);
    await expectNoBlockingA11yViolations(page);
  });

  test('gửi form trống: báo không được để trống, không gọi API', async ({ page }) => {
    let apiCalls = 0;
    await blockUnmockedApi(page);
    await page.route(LOGIN_API, route => {
      apiCalls += 1;
      return route.abort('blockedbyclient');
    });
    await page.goto(LOGIN_PATH);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByText('Không được để trống')).toHaveCount(2);
    expect(apiCalls).toBe(0);
  });

  test('tên đăng nhập dưới 3 ký tự: báo lỗi độ dài, không gọi API (ca biên)', async ({ page }) => {
    let apiCalls = 0;
    await blockUnmockedApi(page);
    await page.route(LOGIN_API, route => {
      apiCalls += 1;
      return route.abort('blockedbyclient');
    });
    await page.goto(LOGIN_PATH);
    await submitCredentials(page, 'ab', 'mat-khau-gia');
    await expect(page.getByText('Tên đăng nhập có ít nhất 3 ký tự')).toBeVisible();
    expect(apiCalls).toBe(0);
  });

  test('gửi tên đăng nhập đã trim và viết thường (backend chuẩn hóa như vậy)', async ({ page }) => {
    await openLogin(page);
    let body: unknown;
    await page.route(LOGIN_API, route => {
      body = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: loginResponse('ADMIN') });
    });

    await submitCredentials(page, '  Nguoi.Thu.Nghiem  ', 'mat-khau-gia');

    await expect.poll(() => body).toEqual({ username: 'nguoi.thu.nghiem', password: 'mat-khau-gia' });
  });

  test('sai thông tin (API trả 401): báo lỗi ngay trong thẻ đăng nhập, ở lại trang, không lưu phiên', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: apiError(401, 'UNAUTHORIZED', 'Tên đăng nhập hoặc mật khẩu không chính xác'),
    }));

    await submitCredentials(page, 'nguoi.thu.nghiem', 'mat-khau-sai');

    await expect(page.getByRole('alert')).toContainText('Tên đăng nhập hoặc mật khẩu không chính xác');
    await expect(page).toHaveURL(LOGIN_URL);
    expect(await hasSession(page)).toBe(false);
  });

  test('lỗi 400 có fieldErrors: hiển thị thông điệp của từng trường', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: apiError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [
        { field: 'username', message: 'Tên đăng nhập không hợp lệ' },
      ]),
    }));

    await submitCredentials(page, 'nguoi.thu.nghiem', 'mat-khau-gia');

    await expect(page.getByRole('alert')).toContainText('Tên đăng nhập không hợp lệ');
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test('lỗi máy chủ 500: báo bằng thông báo, không lộ chi tiết nội bộ, không lưu phiên', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: apiError(500, 'INTERNAL_ERROR', 'Hệ thống đang bận, vui lòng thử lại sau'),
    }));

    await submitCredentials(page, 'nguoi.thu.nghiem', 'mat-khau-gia');

    const toast = page.locator('.toast-error');
    await expect(toast).toBeVisible();
    await expect(toast).not.toContainText('Exception');
    await expect(page).toHaveURL(LOGIN_URL);
    expect(await hasSession(page)).toBe(false);
  });

  test('đăng nhập thành công (dữ liệu giả): lưu phiên và rời trang đăng nhập', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 200, contentType: 'application/json', body: loginResponse('ADMIN'),
    }));

    await submitCredentials(page, 'nguoi.thu.nghiem', 'mat-khau-gia');

    await expect(page).not.toHaveURL(LOGIN_URL);
    expect(await page.evaluate(key => localStorage.getItem(key), TOKEN_KEY)).not.toBeNull();
  });
});

test.describe('Guard định tuyến và trang "Không có quyền" (F01)', () => {
  test('chưa đăng nhập vào khu quản lý: chuyển về đăng nhập kèm returnUrl', async ({ page }) => {
    await blockUnmockedApi(page);
    await page.goto('/mng/users');
    await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fmng%2Fusers$/);
    await expect(page.locator('#login-username')).toBeVisible();
  });

  test('đăng nhập với returnUrl hợp lệ: quay lại đúng trang đã yêu cầu', async ({ page }) => {
    await blockUnmockedApi(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 200, contentType: 'application/json', body: loginResponse('ADMIN'),
    }));
    await page.goto('/mng/users');
    await expect(page.locator('#login-username')).toBeVisible();

    await submitCredentials(page, 'nguoi.thu.nghiem', 'mat-khau-gia');

    await expect(page).toHaveURL(/\/mng\/users$/);
  });

  test('đã đăng nhập nhưng thiếu quyền (LECTURER vào trang chỉ ADMIN): hiện trang "Không có quyền"', async ({ page }) => {
    await openLogin(page);
    await page.route(LOGIN_API, route => route.fulfill({
      status: 200, contentType: 'application/json', body: loginResponse('LECTURER'),
    }));
    await submitCredentials(page, 'nguoi.thu.nghiem', 'mat-khau-gia');
    await expect(page).not.toHaveURL(LOGIN_URL);

    await page.goto('/mng/users');

    await expect(page).toHaveURL(/\/mng\/forbidden$/);
    await expect(page.getByRole('heading', { name: 'Bạn không có quyền xem trang này' })).toBeVisible();
    await expectNoBlockingA11yViolations(page);
  });
});
