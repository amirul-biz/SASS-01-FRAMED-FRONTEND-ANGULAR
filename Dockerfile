# syntax=docker/dockerfile:1

# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG NG_BUILD_CONFIG=production
ARG ENV_CONFIG_JSON
RUN node scripts/write-environment.js
RUN npm run build -- --configuration $NG_BUILD_CONFIG

# ── Stage 2: Serve ────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/framed/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1
