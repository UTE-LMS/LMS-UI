#!/usr/bin/env bash
# Kiểm tra sức khỏe sau triển khai: trang chính, đúng phiên bản, cấu hình runtime và (tùy chọn) API.
#
# Biến bắt buộc:  STAGING_URL        địa chỉ gốc của UI đã triển khai (không có "/" cuối)
# Biến tùy chọn:  EXPECTED_VERSION   chuỗi phải có trong /version.txt (thường là SHA đầy đủ của commit)
#                 API_BASE_URL       nếu đặt, /config.js phải chứa đúng giá trị này
#                 STAGING_API_HEALTH_URL  địa chỉ health của API (ví dụ <API>/actuator/health); phải trả 200
#                 HEALTH_RETRIES     số lần thử (mặc định 30, cách nhau 5 giây)
set -euo pipefail

: "${STAGING_URL:?Thiếu STAGING_URL}"
base="${STAGING_URL%/}"
retries="${HEALTH_RETRIES:-30}"

ready=false
for attempt in $(seq 1 "$retries"); do
  if curl -fsS --max-time 5 "${base}/healthz" > /dev/null; then
    ready=true
    break
  fi
  echo "Chờ ${base}/healthz (${attempt}/${retries})..."
  sleep 5
done
if [ "$ready" != "true" ]; then
  echo "::error::${base}/healthz không phản hồi 200 sau ${retries} lần thử"
  exit 1
fi

status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${base}/")"
if [ "$status" != "200" ]; then
  echo "::error::Trang chính trả ${status}, cần 200"
  exit 1
fi

if [ -n "${EXPECTED_VERSION:-}" ]; then
  version="$(curl -fsS --max-time 10 "${base}/version.txt")"
  case "$version" in
    *"${EXPECTED_VERSION}"*) ;;
    *)
      echo "::error::version.txt là '${version}', không chứa '${EXPECTED_VERSION}'"
      exit 1
      ;;
  esac
fi

if [ -n "${API_BASE_URL:-}" ]; then
  config="$(curl -fsS --max-time 10 "${base}/config.js")"
  case "$config" in
    *"${API_BASE_URL}"*) ;;
    *)
      echo "::error::config.js không chứa API_BASE_URL đã cấu hình"
      exit 1
      ;;
  esac
fi

if [ -n "${STAGING_API_HEALTH_URL:-}" ]; then
  curl -fsS --max-time 10 "${STAGING_API_HEALTH_URL}" > /dev/null
fi

echo "health-check: OK (${base})"
