/**
 * Cấu hình nạp lúc chạy (runtime), không bake vào bundle.
 *
 * `index.html` nạp `config.js` (đặt `globalThis.APP_CONFIG`) trước bundle Angular. Khi chạy trong container,
 * `deploy/docker-entrypoint.d/40-runtime-config.sh` sinh `config.js` từ biến môi trường, nên cùng một image dùng
 * được cho nhiều môi trường. Chạy `ng serve` thì `src/config.js` rỗng và `environment.ts` quyết định.
 * Xem `doc/deploy/staging.md`. Không đặt secret ở đây: mọi giá trị đều gửi xuống trình duyệt.
 */
export interface RuntimeConfig {
  /** Địa chỉ gốc của API, kết thúc bằng "/" (ví dụ "https://api.example.org/"). Rỗng nghĩa là cùng nguồn gốc. */
  serverUrl: string;
  /** Địa chỉ gốc của dịch vụ tệp, cùng quy ước với serverUrl. */
  serverFileUrl: string;
}

const ABSOLUTE_OR_ROOT_URL = /^(https?:\/\/\S+|\/)$/;

function normalizeBaseUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!ABSOLUTE_OR_ROOT_URL.test(trimmed)) {
    return '';
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/** Chỉ chấp nhận chuỗi http(s) tuyệt đối hoặc "/"; giá trị lạ bị bỏ để không dựng URL từ dữ liệu không tin cậy. */
export function readRuntimeConfig(source: unknown): RuntimeConfig {
  const raw = typeof source === 'object' && source !== null ? source as Record<string, unknown> : {};
  return {
    serverUrl: normalizeBaseUrl(raw['serverUrl']),
    serverFileUrl: normalizeBaseUrl(raw['serverFileUrl']),
  };
}

export const runtimeConfig: RuntimeConfig = readRuntimeConfig(
  (globalThis as { APP_CONFIG?: unknown; }).APP_CONFIG,
);
