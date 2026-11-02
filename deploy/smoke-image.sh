#!/usr/bin/env bash
# Kiểm tra nhanh một image UI đã build: chạy container ở chế độ giống staging (hệ tệp chỉ đọc, không root),
# chờ HEALTHCHECK xanh, rồi kiểm tra fallback SPA, cấu hình runtime, 404 tệp tĩnh và user không root.
# Dùng trong CI (job docker) và chạy tay: deploy/smoke-image.sh lms-ui:ci-test
set -euo pipefail

image="${1:?Cách dùng: deploy/smoke-image.sh <image>}"
name="${CONTAINER_NAME:-lms-ui-ci-test}"
port="${HOST_PORT:-8089}"
api_url="https://api.example.invalid"
base="http://localhost:${port}"

remove_container() {
  if docker inspect "$name" > /dev/null 2>&1; then
    docker rm -f "$name" > /dev/null
  fi
}
trap remove_container EXIT
remove_container

docker run -d --name "$name" -p "${port}:8080" \
  --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true \
  -e "API_BASE_URL=${api_url}" "$image" > /dev/null

healthy=false
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$name")"
  if [ "$status" = "running healthy" ]; then
    healthy=true
    break
  fi
  if [ "${status%% *}" != "running" ]; then
    echo "::error::Container dừng bất ngờ (${status})"
    docker logs "$name"
    exit 1
  fi
  sleep 2
done
if [ "$healthy" != "true" ]; then
  echo "::error::HEALTHCHECK không xanh sau 60 giây"
  docker logs "$name"
  exit 1
fi

fail() {
  echo "::error::$1"
  docker logs "$name"
  exit 1
}
status_of() {
  curl -s -o /dev/null -w '%{http_code}' "$1"
}

[ "$(status_of "${base}/")" = "200" ] || fail "Trang chủ không trả 200"
[ "$(status_of "${base}/healthz")" = "200" ] || fail "/healthz không trả 200"
[ "$(status_of "${base}/auth/login")" = "200" ] || fail "Fallback SPA cho đường dẫn sâu không trả index.html"
[ "$(status_of "${base}/assets/khong-co.png")" = "404" ] || fail "Tệp tĩnh không tồn tại phải trả 404"
[ "$(status_of "${base}/main-AAAAAAAA.js.map")" = "404" ] || fail "Source map không được phát hành"

config="$(curl -fsS "${base}/config.js")"
case "$config" in
  *"\"serverUrl\":\"${api_url}\""*) ;;
  *) fail "config.js không phản ánh API_BASE_URL: ${config}" ;;
esac

curl -fsS "${base}/version.txt" > /dev/null || fail "Thiếu version.txt"

uid="$(docker exec "$name" id -u)"
[ "$uid" != "0" ] || fail "Container đang chạy bằng root"

echo "smoke-image: OK (${image}, uid=${uid})"
