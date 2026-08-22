const RENDER_SERVER_PORT = (import.meta.env.VITE_RENDER_SERVER_PORT as string | undefined) || '33623';

// Serwer rendera działa lokalnie na maszynie developera (localhost:33623).
// Na telefonie w sieci LAN (np. 192.168.x.x) localhost wskazuje na telefon
// → ERR_CONNECTION_REFUSED. Dlatego gdy host jest adresem LAN, używamy go
// jako hosta serwera (ten sam LAN co PC z serwerem).
// Na producji (HTTPS) zawsze localhost — Mixed Content blokuje HTTP z domeny.
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
