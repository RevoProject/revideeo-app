/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export const APP_VERSION = '0.3.0';
const VERSION_CHECK_INTERVAL = 60 * 60 * 1000;
const VERSION_KEY = 'revideeo:app-version';

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch {
    return null;
  }
};

export const checkForUpdate = (onUpdate: (remoteVersion: string) => void): (() => void) => {
  let cancelled = false;
  const check = async () => {
    if (cancelled || !navigator.onLine) return;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const remote = data.version as string;
      if (remote && remote !== APP_VERSION) {
        onUpdate(remote);
      }
    } catch { /* offline or no version file */ }
  };
  void check();
  const interval = setInterval(check, VERSION_CHECK_INTERVAL);
  return () => { cancelled = true; clearInterval(interval); };
};

export const getStoredVersion = (): string | null => {
  try { return localStorage.getItem(VERSION_KEY); } catch { return null; }
};

export const setStoredVersion = (v: string): void => {
  try { localStorage.setItem(VERSION_KEY, v); } catch { /* noop */ }
};

export const applyUpdate = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      await reg.unregister();
    }
  }
  caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => {
    window.location.reload();
  });
};
