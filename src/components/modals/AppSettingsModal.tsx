/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { ChevronDown, ChevronRight, Puzzle, Plus, Trash2, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import type { AppLanguage, AppSettings, RenderServer } from '../../types';
import { RENDER_SERVER_BASE_URL } from '../../export/renderServerConfig';
import { generateId } from '../../storage';
import { useTranslation } from '../../i18n';
import { APP_VERSION } from '../../pwa';

const LANGUAGES: { code: AppLanguage; flag: string; labelKey: string }[] = [
  { code: 'pl', flag: '🇵🇱', labelKey: 'lang.pl' },
  { code: 'en', flag: '🇬🇧', labelKey: 'lang.en' },
  { code: 'de', flag: '🇩🇪', labelKey: 'lang.de' },
];

const CONNECTIONS = ['Google Drive', 'Onedrive', 'Dropbox'];

const newServerId = (): string => generateId();

export const AppSettingsModal = ({
  settings,
  autoSaveOptions,
  onConfirm,
  onClose,
  onOpenProjectSettings,
  onOpenPlugins,
  mobile = false,
}: {
  settings: AppSettings;
  autoSaveOptions: { value: number; label: string }[];
  onConfirm: (autoSaveIntervalMinutes: number, language: AppLanguage, renderServers: RenderServer[], mobileRenderEnabled: boolean) => void;
  onClose: () => void;
  onOpenProjectSettings?: () => void;
  onOpenPlugins?: () => void;
  mobile?: boolean;
}) => {
  const [interval, setInterval] = useState(settings.autoSaveIntervalMinutes);
  const [language, setLanguage] = useState<AppLanguage>(settings.language);
  const [renderServers, setRenderServers] = useState<RenderServer[]>(settings.renderServers ?? []);
  const [showServers, setShowServers] = useState(false);
  const [showExperimental, setShowExperimental] = useState(false);
  const [mobileRenderEnabled, setMobileRenderEnabled] = useState(settings.mobileRenderEnabled ?? false);
  const [showFeatureUnavailable, setShowFeatureUnavailable] = useState(false);
  const { t } = useTranslation();

  const addServer = () => setRenderServers((prev) => [...prev, { id: newServerId(), url: '', alias: '' }]);
  const updateServer = (id: string, patch: Partial<RenderServer>) =>
    setRenderServers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeServer = (id: string) => setRenderServers((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-[440px] max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{t('settings.title')}</h2>
            <p className="mt-0.5 text-[10px] text-gray-500">v{APP_VERSION} · {new Date(document.lastModified).toLocaleDateString('en-CA')}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white" title={t('settings.close')}>
            <X size={18} />
          </button>
        </div>

        <label className="flex flex-col gap-2 text-xs text-gray-400">
          {t('settings.autoSave')}
          <select
            value={interval}
            onChange={(event) => setInterval(parseInt(event.target.value))}
            className="rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-xs text-gray-200 outline-none"
          >
            {autoSaveOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-400">{t('settings.language')}</span>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-bold ${
                  language === item.code ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#2c2d33] bg-[#202124] text-gray-400'
                }`}
              >
                <span className="text-base leading-none">{item.flag}</span>
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-400">{t('settings.connections')}</span>
          <div className="grid grid-cols-3 gap-2">
            {CONNECTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setShowFeatureUnavailable(true)}
                className="rounded-lg border border-[#2c2d33] bg-[#202124] px-2 py-2 text-xs font-bold text-gray-400 hover:bg-[#2a2b30] transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
          {(!mobile || mobileRenderEnabled) && (
            <>
              <button
                type="button"
                onClick={() => setShowServers((open) => !open)}
                className="flex items-center gap-1 text-xs text-gray-300 hover:text-white"
              >
                {showServers ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {t('settings.renderServers')}
              </button>
              {showServers && (
                <div className="fade-in flex flex-col gap-3 border-l border-[#2c2d33] pl-3">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-semibold text-gray-200">Localhost</span>
                      <span className="truncate text-[10px] text-gray-500">{RENDER_SERVER_BASE_URL}</span>
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-green-400">auto</span>
                  </div>
                  {renderServers.map((server) => (
                    <div key={server.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={server.url}
                          onChange={(event) => updateServer(server.id, { url: event.target.value })}
                          placeholder="http://192.168.1.10:33623"
                          className="min-w-0 flex-1 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-xs text-gray-200 outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeServer(server.id)}
                          title={t('settings.removeServer')}
                          className="shrink-0 rounded-lg border border-[#2c2d33] bg-[#202124] p-2 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        value={server.alias ?? ''}
                        onChange={(event) => updateServer(server.id, { alias: event.target.value })}
                        placeholder={t('settings.aliasPlaceholder')}
                        className="rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-xs text-gray-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addServer}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-xs font-bold text-gray-300 hover:text-white"
                  >
                    <Plus size={14} /> {t('settings.addServer')}
                  </button>
                </div>
              )}
            </>
          )}
          {mobile && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowExperimental((open) => !open)}
                className="flex items-center gap-1 text-left text-xs text-amber-300 hover:text-amber-200"
              >
                {showExperimental ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <TriangleAlert size={14} />
                {t('settings.experimental')}
              </button>
              {showExperimental && (
                <div className="fade-in flex flex-col gap-3 border-l border-amber-600/30 pl-3">
                  <p className="rounded-lg border border-amber-600/30 bg-amber-500/10 p-3 text-[10px] leading-relaxed text-amber-200">
                    {t('settings.experimentalDesc')}
                  </p>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-gray-200">
                    <span>{t('settings.mobileRender')}</span>
                    <input
                      type="checkbox"
                      checked={mobileRenderEnabled}
                      onChange={(event) => setMobileRenderEnabled(event.target.checked)}
                      className="h-4 w-4 accent-[#2563EB]"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {onOpenProjectSettings && (
          <button
            onClick={onOpenProjectSettings}
            className="rounded-lg bg-[#202124] hover:bg-[#2a2b30] p-3 text-xs font-bold text-gray-200"
          >
            {t('settings.projectSettings')}
          </button>
        )}

        {onOpenPlugins && (
          <button
            onClick={onOpenPlugins}
            className="flex items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-colors"
          >
            <Puzzle size={14} />
            {t('settings.plugins')}
          </button>
        )}

        <button
          onClick={() => onConfirm(interval, language, renderServers, mobileRenderEnabled)}
          className="rounded-lg bg-blue-600 p-3 text-xs font-bold text-white hover:bg-blue-500"
        >
          {t('settings.save')}
        </button>
      </div>

      {showFeatureUnavailable && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-[360px] flex-col gap-4 rounded-xl border border-[#2c2d33] bg-[#18191c] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{t('common.featureUnavailable')}</h3>
              <button onClick={() => setShowFeatureUnavailable(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-xs text-gray-400">{t('common.featureUnavailableDesc')}</p>
            <button
              onClick={() => setShowFeatureUnavailable(false)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
            >
              {t('common.ok')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
