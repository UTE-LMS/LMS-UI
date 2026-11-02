#!/usr/bin/env bash
# Triển khai image UI lên staging qua SSH + docker compose.
# ĐÂY LÀ KHUNG: nền tảng staging chưa được chọn (issue #11 chờ GVHD/Khoa). Mọi tham số đến từ biến môi trường
# (CI nạp từ GitHub Environment "staging"); script không chứa host, URL hay khóa cố định.
#
# Biến bắt buộc:
#   LMS_UI_IMAGE        image đầy đủ cần chạy, ví dụ ghcr.io/ute-lms/lms-ui:sha-abc1234
#   STAGING_SSH_HOST    máy chủ staging
#   STAGING_SSH_USER    người dùng SSH
#   API_BASE_URL        địa chỉ backend mà trình duyệt sẽ gọi (ghi vào config.js lúc container khởi động)
# Biến tùy chọn:
#   FILE_BASE_URL       địa chỉ dịch vụ tệp (mặc định bằng API_BASE_URL)
#   STAGING_DEPLOY_DIR  thư mục trên máy chủ (mặc định /opt/lms-ui)
#   STAGING_SSH_PORT    cổng SSH (mặc định 22)
#   GHCR_PULL_USER, GHCR_PULL_TOKEN  chỉ cần khi image GHCR ở chế độ riêng tư
# Yêu cầu: ssh-agent hoặc khóa đã nạp sẵn, known_hosts đã có máy chủ (StrictHostKeyChecking=yes).
set -euo pipefail

: "${LMS_UI_IMAGE:?Thiếu LMS_UI_IMAGE}"
: "${STAGING_SSH_HOST:?Thiếu STAGING_SSH_HOST}"
: "${STAGING_SSH_USER:?Thiếu STAGING_SSH_USER}"
: "${API_BASE_URL:?Thiếu API_BASE_URL}"

remote_dir="${STAGING_DEPLOY_DIR:-/opt/lms-ui}"
ssh_port="${STAGING_SSH_PORT:-22}"
target="${STAGING_SSH_USER}@${STAGING_SSH_HOST}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ssh_opts=(-p "$ssh_port" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
scp_opts=(-P "$ssh_port" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)

ssh "${ssh_opts[@]}" "$target" "mkdir -p $(printf '%q' "$remote_dir")"
scp "${scp_opts[@]}" "${script_dir}/docker-compose.staging.yml" "${target}:${remote_dir}/docker-compose.yml"

if [ -n "${GHCR_PULL_TOKEN:-}" ]; then
  printf '%s' "$GHCR_PULL_TOKEN" | ssh "${ssh_opts[@]}" "$target" \
    "docker login ghcr.io -u $(printf '%q' "${GHCR_PULL_USER:?Thiếu GHCR_PULL_USER}") --password-stdin"
fi

# Ghi nhớ image đang chạy để rollback, rồi ghi .env mới (chỉ chứa cấu hình không bí mật) và cập nhật.
ssh "${ssh_opts[@]}" "$target" bash -s -- \
  "$remote_dir" "$LMS_UI_IMAGE" "$API_BASE_URL" "${FILE_BASE_URL:-}" <<'REMOTE'
set -euo pipefail
dir="$1"; image="$2"; api="$3"; files="$4"
cd "$dir"
if [ -f .env ]; then
  previous="$(grep '^LMS_UI_IMAGE=' .env | cut -d= -f2-)"
  if [ -n "$previous" ]; then
    printf '%s\n' "$previous" > previous-image.txt
  fi
fi
printf 'LMS_UI_IMAGE=%s\nAPI_BASE_URL=%s\nFILE_BASE_URL=%s\n' "$image" "$api" "$files" > .env
docker compose pull
docker compose up -d --remove-orphans
REMOTE

echo "deploy-staging: đã cập nhật ${STAGING_SSH_HOST} lên ${LMS_UI_IMAGE}"
