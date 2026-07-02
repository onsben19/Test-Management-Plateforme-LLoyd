# InsureTM — image unifiée Render (frontend + backend + Playwright + noVNC + nginx)
# Build context : racine du dépôt (dockerContext: .)

# ── Stage 1 : Frontend React ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY project/package.json project/package-lock.json* ./
RUN npm ci --frozen-lockfile
COPY project/ .
RUN npm run build

# ── Stage 2 : Python deps ────────────────────────────────────────────────
FROM python:3.11-slim AS python-builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*
COPY InsureTM/requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# ── Stage 3 : Runtime ───────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl gnupg nginx gettext-base \
    xvfb xauth x11vnc fluxbox novnc python3-websockify \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g playwright \
    && npx playwright install --with-deps chromium \
    && mkdir -p /project /var/www/frontend /app/media /app/staticfiles \
    && rm -rf /var/lib/apt/lists/*

# Playwright runner deps
COPY project/package.json project/package-lock.json* /project/
RUN cd /project && npm ci --frozen-lockfile
COPY project/playwright.config.ts /project/playwright.config.ts
RUN mkdir -p /project/tests/generated

COPY --from=python-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-builder /usr/local/bin /usr/local/bin
COPY InsureTM/ /app/
COPY --from=frontend-builder /frontend/dist /var/www/frontend

COPY render/nginx.render.conf.template /etc/nginx/render/nginx.render.conf.template
COPY render/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONUNBUFFERED=1
EXPOSE 10000

CMD ["/entrypoint.sh"]
