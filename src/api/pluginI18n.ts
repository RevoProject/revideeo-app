/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

export interface PluginI18nEntry {
  pluginId: string;
  lang: string;
  translations: Record<string, string>;
}

let _currentLang = 'pl';
let _translations = new Map<string, Map<string, string>>();

export const setPluginLang = (lang: string): void => {
  _currentLang = lang;
};

export const getPluginLang = (): string => _currentLang;

export const registerPluginTranslations = (pluginId: string, lang: string, translations: Record<string, string>): void => {
  if (!_translations.has(lang)) _translations.set(lang, new Map());
  const langMap = _translations.get(lang)!;
  for (const [key, value] of Object.entries(translations)) {
    langMap.set(`${pluginId}:${key}`, value);
  }
};

export const translatePluginKey = (key: string, vars?: Record<string, string>): string => {
  const langMap = _translations.get(_currentLang) ?? _translations.get('en') ?? _translations.get('pl');
  let value = langMap?.get(key) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return value;
};

export const getAvailablePluginLangs = (): string[] => {
  return [...new Set([..._translations.keys()])];
};
