/**
 * API / WebSocket / noVNC URLs — supports split domains in production.
 * Prod: insuretb.tech (frontend) + api.insuretb.tech (API, WS, noVNC)
 * Dev:  localhost:5173 with Vite proxy → backend
 */

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`).replace(/\/+$/, '');
}

/** HTTP(S) backend origin, e.g. https://api.insuretb.tech */
export function getApiOrigin(): string {
  const base = apiBaseUrl();
  if (base.includes('://')) {
    return base.replace(/\/api$/i, '');
  }
  return window.location.origin;
}

/** WebSocket base, e.g. wss://api.insuretb.tech */
export function getWsBaseUrl(): string {
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  const origin = getApiOrigin();
  const url = new URL(origin);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}`;
}

/** noVNC viewer URL (iframe or new tab) */
export function getNovncUrl(options?: { viewOnly?: boolean; showDot?: boolean }): string {
  const params = new URLSearchParams({ autoconnect: 'true', resize: 'scale' });
  if (options?.viewOnly === false) params.set('view_only', '0');
  if (options?.showDot) params.set('show_dot', 'true');

  if (import.meta.env.DEV) {
    return `/novnc/vnc.html?${params.toString()}`;
  }
  return `${getApiOrigin().replace(/\/$/, '')}/novnc/vnc.html?${params.toString()}`;
}
