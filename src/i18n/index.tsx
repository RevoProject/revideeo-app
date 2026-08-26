/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import type { AppLanguage } from '../types';
import plTranslations from './pl.json';
import enTranslations from './en.json';
import deTranslations from './de.json';

const translations: Record<AppLanguage, Record<string, string>> = {
  pl: plTranslations,
  en: enTranslations,
  de: deTranslations,
};

const LANG_KEYS: AppLanguage[] = ['pl', 'en', 'de'];

const LANG_STORAGE_KEY = 'revideeo:lang';

/* eslint-disable react/only-export-components */
export const detectLanguage = (): AppLanguage => {
  const langPref = localStorage.getItem(LANG_STORAGE_KEY);
  if (langPref && LANG_KEYS.includes(langPref as AppLanguage)) return langPref as AppLanguage;
  const stored = localStorage.getItem('revideeo:settings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.language && LANG_KEYS.includes(parsed.language)) return parsed.language;
    } catch { /* ignore */ }
  }
  const ua = navigator.language || navigator.userAgent;
  const lower = ua.toLowerCase();
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('pl')) return 'pl';
  return 'en';
};
/* eslint-enable react/only-export-components */

interface I18nContextValue {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'pl',
  setLang: () => {},
  t: (key) => key,
});

export const I18nProvider = ({ children, defaultLang }: { children: ReactNode; defaultLang?: AppLanguage }) => {
  const [lang, setLangState] = useState<AppLanguage>(defaultLang ?? detectLanguage());

  const setLang = useCallback((newLang: AppLanguage) => {
    setLangState(newLang);
    try { localStorage.setItem(LANG_STORAGE_KEY, newLang); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LANG_STORAGE_KEY && e.newValue && LANG_KEYS.includes(e.newValue as AppLanguage)) {
        setLangState(e.newValue as AppLanguage);
      }
      if (e.key === 'revideeo:settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.language && LANG_KEYS.includes(parsed.language)) {
            setLangState(parsed.language);
            try { localStorage.setItem(LANG_STORAGE_KEY, parsed.language); } catch { /* noop */ }
          }
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let value = translations[lang]?.[key] ?? translations.en[key] ?? translations.pl[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/* eslint-disable react/only-export-components */
export const useTranslation = () => useContext(I18nContext);

export const useT = () => {
  const { t } = useContext(I18nContext);
  return t;
};
/* eslint-enable react/only-export-components */
