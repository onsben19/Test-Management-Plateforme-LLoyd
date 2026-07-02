#!/bin/sh
set -e

export PORT="${PORT:-10000}"
export DISPLAY="${DISPLAY:-:99}"

echo "==> InsureTM Render entrypoint (PORT=$PORT)"

# Écran virtuel + VNC + noVNC (headed Playwright)
Xvfb :99 -screen 0 1280x720x24 &
sleep 1
x11vnc -display :99 -forever -nopw -shared -rfbport 5900 &
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &

cd /app
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# ASGI (API + WebSockets)
daphne -b 127.0.0.1 -p 8000 config.asgi:application &

# Nginx — seul port exposé par Render
envsubst '${PORT}' < /etc/nginx/render/nginx.render.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'
