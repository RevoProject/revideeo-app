/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

const RENDER_SERVER_PORT = (import.meta.env.VITE_RENDER_SERVER_PORT as string | undefined) || '33623';

// Render server runs locally on the developer machine (localhost:33623).
// On a phone on the LAN (e.g. 192.168.x.x), localhost points to the phone
// → ERR_CONNECTION_REFUSED. So when the host is a LAN address, we use it
// as the server host (same LAN as the PC running the server).
// In production (HTTPS), always localhost — mixed content blocks HTTP from a domain.
const isLocalHost = (h: string) =>
  h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
const isLanIp = (h: string) => /^192\.168\.\d+\.\d+$/.test(h) || /^10\.\d+\.\d+\.\d+$/.test(h);

export const RENDER_SERVER_BASE_URL: string = (() => {
  const explicit = import.meta.env.VITE_RENDER_SERVER_URL as string | undefined;
  if (explicit && explicit.trim()) return explicit.trim();
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (isLocalHost(host) || !isLanIp(host)) return `http://localhost:${RENDER_SERVER_PORT}`;
  return `http://${host}:${RENDER_SERVER_PORT}`;
})();
