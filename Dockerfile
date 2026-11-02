# syntax=docker/dockerfile:1
# UI là SPA tĩnh (ADR 0001): build bằng Node, phục vụ bằng nginx không root. URL API nạp lúc khởi động container.

# ---- Chặng build (bị loại khỏi image cuối) ----
FROM node:24.13.0-bookworm-slim@sha256:4660b1ca8b28d6d1906fd644abe34b2ed81d15434d26d845ef0aced307cf4b6f AS build
WORKDIR /app
# Khớp "packageManager" trong package.json
RUN npm install --global npm@11.12.1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Phiên bản đang chạy, dùng cho health check sau triển khai (không chứa secret)
ARG VERSION=dev
ARG VCS_REF=unknown
RUN echo "${VERSION} ${VCS_REF}" > dist/browser/version.txt

# ---- Chặng chạy ----
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03 AS runtime

ARG VERSION=dev
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="LMS-UI" \
      org.opencontainers.image.description="Giao dien Angular (SPA tinh) cua he thong LOMS" \
      org.opencontainers.image.source="https://github.com/UTE-LMS/LMS-UI" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}"

# Image nền được ghim theo digest nhưng có thể chứa gói Alpine đã có bản vá (Trivy từng báo brotli-libs, curl).
# Nâng cấp gói hệ điều hành lúc build rồi trả về user không root.
USER root
RUN apk upgrade --no-cache

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --chmod=0755 deploy/docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist/browser /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
