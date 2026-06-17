# ============================================================
# Stage 1 — Build
# ============================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# System dependencies for psycopg2 and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================================
# Stage 2 — Runtime
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# Runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    gnupg \
    xvfb \
    xauth \
    x11vnc \
    fluxbox \
    novnc \
    python3-websockify \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g playwright \
    && npx playwright install --with-deps chromium \
    && mkdir -p /project && cd /project && npm init -y && npm install @playwright/test \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy project source
COPY . .

# Create media directory
RUN mkdir -p /app/media

EXPOSE 8000 5900 6080

# Start Xvfb + x11vnc + noVNC (websockify), then run Django
CMD ["sh", "-c", "\
  Xvfb :99 -screen 0 1280x720x24 & \
  export DISPLAY=:99 && \
  sleep 1 && \
  x11vnc -display :99 -forever -nopw -shared -rfbport 5900 & \
  websockify --web=/usr/share/novnc/ 6080 localhost:5900 & \
  python manage.py migrate --noinput && \
  python manage.py collectstatic --noinput && \
  daphne -b 0.0.0.0 -p 8000 config.asgi:application"]
