const RENDER_SERVER_PORT = (import.meta.env.VITE_RENDER_SERVER_PORT as string | undefined) || '3000';

// Domyślnie serwer rendera działa na tej samej maszynie co aplikacja, ale pod
// portem 3000. Na telefonie (gdy apka jest otwarta przez adres LAN PC) literał
// "localhost" wskazywałby na sam telefon → ERR_CONNECTION_REFUSED. Dlatego baza
// jest wyprowadzana z hosta, z którego załadowano stronę (np. 192.168.x.x:3000).
export const RENDER_SERVER_BASE_URL: string = (() => {
  const explicit = import.meta.env.VITE_RENDER_SERVER_URL as string | undefined;
  if (explicit && explicit.trim()) return explicit.trim();
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:${RENDER_SERVER_PORT}`;
})();
