#!/bin/sh
# Sinh /tmp/runtime-config/config.js từ biến môi trường khi container khởi động (chạy bởi entrypoint của image nginx).
#   API_BASE_URL   Địa chỉ gốc của backend, ví dụ https://api.example.org (bắt buộc ở môi trường thật; rỗng = cùng nguồn gốc)
#   FILE_BASE_URL  Địa chỉ gốc dịch vụ tệp (mặc định bằng API_BASE_URL)
#   GOOGLE_CLIENT_ID  OAuth client ID loại Web để đăng nhập bằng Google (rỗng = tắt; phải trùng GOOGLE_CLIENT_ID của API)
# Chỉ nhận URL http(s) tuyệt đối hoặc "/" để không chèn được mã vào tệp JavaScript. Không đặt secret vào các biến này:
# giá trị được gửi xuống trình duyệt.
set -eu

dir=/tmp/runtime-config
api="${API_BASE_URL:-}"
files="${FILE_BASE_URL:-$api}"
google="${GOOGLE_CLIENT_ID:-}"

check() {
  name="$1"
  value="$2"
  if [ -z "$value" ]; then
    return 0
  fi
  if ! printf '%s' "$value" | grep -Eq '^(/|https?://[A-Za-z0-9._~:/?#@%+,=&;-]+)$'; then
    echo "40-runtime-config: $name không hợp lệ (chỉ nhận http(s) tuyệt đối hoặc /)" >&2
    exit 1
  fi
}

# Client ID Google chỉ gồm số, chữ, "-", "_" và hậu tố .apps.googleusercontent.com
if [ -n "$google" ] && ! printf '%s' "$google" | grep -Eq '^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$'; then
  echo "40-runtime-config: GOOGLE_CLIENT_ID không hợp lệ (dạng <số>-<chuỗi>.apps.googleusercontent.com)" >&2
  exit 1
fi

check API_BASE_URL "$api"
check FILE_BASE_URL "$files"

mkdir -p "$dir"
printf 'globalThis.APP_CONFIG = {"serverUrl":"%s","serverFileUrl":"%s","googleClientId":"%s"};\n' "$api" "$files" "$google" > "$dir/config.js"
echo "40-runtime-config: đã ghi $dir/config.js (serverUrl=${api:-<cùng nguồn gốc>})"
