import { useEffect, useRef, useState } from 'react';

export interface RenderServerOption {
  url: string;
  label: string;
}

const CHECK_TIMEOUT_MS = 2500;
const BASE_INTERVAL_MS = 5000;
const MAX_INTERVAL_MS = 60000;

const checkOne = async (url: string, requiredModule?: string): Promise<boolean> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/api/health`, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return false;
    if (!requiredModule) return true;
    const body = (await res.json()) as { modules?: Record<string, boolean> };
    return body.modules?.[requiredModule] === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

export const useRenderServersStatus = (
  servers: RenderServerOption[],
  _intervalMs = BASE_INTERVAL_MS,
  enabled = true,
  requiredModule?: string,
) => {
  const [available, setAvailable] = useState<RenderServerOption[]>([]);
  const [checking, setChecking] = useState(true);
  const key = `${requiredModule ?? ''}:${servers.map((s) => s.url).join('|')}`;
  const failCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = async () => {
      setChecking(true);
      const results = await Promise.all(servers.map(async (s) => ({ s, ok: await checkOne(s.url, requiredModule) })));
      if (cancelled) return;
      const nowAvailable = results.filter((r) => r.ok).map((r) => r.s);
      setAvailable(nowAvailable);
      setChecking(false);

      if (nowAvailable.length === 0 && servers.length > 0) {
        failCountRef.current = Math.min(failCountRef.current + 1, 10);
      } else {
        failCountRef.current = 0;
      }

      const backoff = Math.min(BASE_INTERVAL_MS * Math.pow(2, failCountRef.current), MAX_INTERVAL_MS);
      timerRef.current = setTimeout(() => void run(), backoff);
    };

    void run();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, requiredModule]);

  return { checking, available };
};
