import AxeBuilder from '@axe-core/playwright';
import { expect, Page } from '@playwright/test';

/** Nhãn bắt buộc cho mọi dữ liệu giả (CLAUDE.md quy tắc 2, Rubric V4). */
export const TEST_DATA_LABEL = 'DỮ LIỆU THỬ NGHIỆM';

/** Khóa localStorage mà ứng dụng dùng để lưu phiên (SystemConstant.CURRENT_INFO). */
export const TOKEN_KEY = 'CURRENT_INFO';

const BLOCKING_IMPACTS = ['serious', 'critical'];

/**
 * Quét tiếp cận bằng axe với toàn bộ rule mặc định (không tắt rule nào) và yêu cầu không có vi phạm mức
 * serious/critical. Khi test fail, thông báo liệt kê từng rule vi phạm.
 */
export async function expectNoBlockingA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(v => v.impact && BLOCKING_IMPACTS.includes(v.impact));
  const summary = blocking.map(v => `${v.impact}: ${v.id} (${v.nodes.length} phần tử) - ${v.help}`);
  expect(summary, 'Vi phạm tiếp cận serious/critical').toEqual([]);
}

/**
 * Chặn mọi yêu cầu tới máy chủ API thật: test không được phụ thuộc backend. Cũng chặn dịch vụ báo lỗi của
 * Google Apps Script (bản production tự gửi báo lỗi khi gặp lỗi 5xx) để test không gửi dữ liệu ra ngoài.
 */
export async function blockUnmockedApi(page: Page): Promise<void> {
  await page.route(/\/(rest|api)\//, route => route.abort('blockedbyclient'));
  await page.route(/script\.google\.com/, route => route.abort('blockedbyclient'));
}
