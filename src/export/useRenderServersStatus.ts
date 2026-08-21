import { useEffect, useState } from 'react';

export interface RenderServerOption {
  url: string;
  label: string;
}

const CHECK_TIMEOUT_MS = 2500;

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
  intervalMs = 5000,
  enabled = true,
  requiredModule?: string,
) => {
  const [available, setAvailable] = useState<RenderServerOption[]>([]);
  const [checking, setChecking] = useState(true);
  const key = `${requiredModule ?? ''}:${servers.map((s) => s.url).join('|')}`;

  useEffect(() => {
    if (!enabled) return; // Wstrzymane (np. podczas trwającego renderu) — nie sonduj serwerów
    let cancelled = false;
    const run = async () => {
      setChecking(true);
       const results = await Promise.all(servers.map(async (s) => ({ s, ok: await checkOne(s.url, requiredModule) })));
      if (cancelled) return;
      setAvailable(results.filter((r) => r.ok).map((r) => r.s));
      setChecking(false);
    };
    void run();
    const id = setInterval(() => void run(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs, enabled, requiredModule]);

  return { checking, available };
};
