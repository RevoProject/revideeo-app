import type { PluginDefinition, PluginContext } from '../../src/api/types';
import React from 'react';
import { useTranslation, detectLanguage } from '../../src/i18n';
import plTranslations from '../../src/i18n/pl.json';
import enTranslations from '../../src/i18n/en.json';
import deTranslations from '../../src/i18n/de.json';

const translations: Record<string, Record<string, string>> = {
  pl: plTranslations,
  en: enTranslations,
  de: deTranslations,
};

const tStandalone = (key: string, vars?: Record<string, string | number>): string => {
  const lang = detectLanguage();
  let value = translations[lang]?.[key] ?? translations.en[key] ?? translations.pl[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return value;
};

interface Caption {
  id: string;
  text: string;
  start: number;
  end: number;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
};

/* eslint-disable react/only-export-components */
const CaptionsTab = ({ context }: { context: PluginContext }) => {
  const [lang, setLang] = React.useState('pl');
  const [model, setModel] = React.useState('small');
  const [style, setStyle] = React.useState('bold');
  const [fontSize, setFontSize] = React.useState('48');
  const [generating, setGenerating] = React.useState(false);
  const [captions, setCaptions] = React.useState<Caption[]>([]);
  const [confirmRegen, setConfirmRegen] = React.useState(false);
  const { t } = useTranslation();

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    const fps = 30;
    const newCaptions: Caption[] = [
      { id: 'c1', text: 'Witaj w ReVideeo', start: 0, end: 2.5 },
      { id: 'c2', text: 'To edytor wideo nowej generacji', start: 2.5, end: 5.2 },
      { id: 'c3', text: 'Z automatycznymi napisami', start: 5.2, end: 7.8 },
      { id: 'c4', text: 'I inteligentną edycją', start: 7.8, end: 10 },
    ];
    setCaptions(newCaptions);
    setGenerating(false);

    const tracks = context.project.getTrackSettings();
    let captionsTrackIndex = tracks.findIndex((t) => t.name === 'CAPTIONS');
    if (captionsTrackIndex === -1) {
      captionsTrackIndex = tracks.length;
    }

    for (const cap of newCaptions) {
      const startFrame = Math.round(cap.start * fps);
      const durationFrames = Math.round((cap.end - cap.start) * fps);
      context.clips.add({
        type: 'text', sourceId: `caption-${cap.id}`, trackIndex: captionsTrackIndex,
        offsetInTimeline: startFrame, startFrame: 0, durationInFrames: durationFrames,
        scale: 1, posX: 0, posY: 0, width: 80, height: 16,
        text: cap.text, fontSize: Number(fontSize), fontWeight: 600,
        textColor: '#ffffff', textAlign: 'center',
        transitionIn: 'none', transitionDurationInFrames: 0,
        opacity: 1,
      });
    }
  };

  const handleRegen = () => {
    setConfirmRegen(true);
  };

  const confirmRegeneration = () => {
    setConfirmRegen(false);
    setCaptions([]);
    void handleGenerate();
  };

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 sm:h-8 sm:w-8">
          <span className="text-xs font-bold text-blue-400 sm:text-sm">CC</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-bold text-gray-200">{t('plugin.captions.autoCaptions')}</div>
          <div className="text-[10px] text-gray-500">{t('plugin.captions.whisperAI')}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[10px] text-gray-400 sm:text-[11px]">
          <span>{t('plugin.captions.language')}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded border border-[#2c2d33] bg-[#2a2b30] px-2 py-1.5 text-[10px] text-gray-200 outline-none sm:text-[11px]">
            <option value="pl">{t('lang.pl')}</option>
            <option value="en">{t('lang.en')}</option>
            <option value="de">{t('lang.de')}</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-gray-400 sm:text-[11px]">
          <span>Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded border border-[#2c2d33] bg-[#2a2b30] px-2 py-1.5 text-[10px] text-gray-200 outline-none sm:text-[11px]">
            <option value="tiny">Tiny</option>
            <option value="base">Base</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-gray-400 sm:text-[11px]">
          <span>{t('plugin.captions.style')}</span>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded border border-[#2c2d33] bg-[#2a2b30] px-2 py-1.5 text-[10px] text-gray-200 outline-none sm:text-[11px]">
            <option value="bold">{t('plugin.captions.styleBoldWhite')}</option>
            <option value="outline">{t('plugin.captions.styleOutline')}</option>
            <option value="box">{t('plugin.captions.styleBox')}</option>
            <option value="minimal">{t('plugin.captions.styleMinimal')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-gray-400 sm:text-[11px]">
          <span>{t('plugin.captions.fontSize')}</span>
          <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="rounded border border-[#2c2d33] bg-[#2a2b30] px-2 py-1.5 text-[10px] text-gray-200 outline-none sm:text-[11px]">
            <option value="32">32px</option>
            <option value="48">48px</option>
            <option value="64">64px</option>
          </select>
        </label>
      </div>

      {captions.length > 0 && (
        <button onClick={handleRegen} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-[10px] font-semibold text-gray-400 hover:bg-[#2a2b30] hover:text-gray-200 transition-colors sm:text-[11px]">
          {t('plugin.captions.retryGeneration')}
        </button>
      )}

      <button onClick={() => void handleGenerate()} disabled={generating} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-500 active:bg-blue-400 transition-colors disabled:opacity-50">
        {generating ? t('plugin.captions.generating') : captions.length > 0 ? t('plugin.captions.generate') : t('plugin.captions.generate')}
      </button>

      {captions.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-[#2c2d33] bg-[#141517] p-2 sm:p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold tracking-wider text-gray-500">{t('plugin.captions.captionsLabel', { count: captions.length })}</span>
            <span className="text-[9px] text-blue-400">{t('plugin.captions.trackLabel')}</span>
          </div>
          <div className="flex max-h-[200px] flex-col gap-0.5 overflow-y-auto">
            {captions.map((c) => (
              <div key={c.id} className="flex items-start gap-2 rounded bg-[#202124] px-2 py-1.5 hover:bg-[#2a2b30]">
                <span className="shrink-0 font-mono text-[9px] text-gray-500 pt-px">{formatTime(c.start)}</span>
                <span className="min-w-0 flex-1 text-[10px] leading-snug text-gray-300 sm:text-[11px]">{c.text}</span>
                <span className="shrink-0 font-mono text-[9px] text-gray-600 pt-px">{formatTime(c.end)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmRegen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60">
          <div className="mx-4 flex w-full max-w-[320px] flex-col gap-3 rounded-xl border border-[#2c2d33] bg-[#18191c] p-4 shadow-2xl">
            <p className="text-xs font-bold text-white">{t('plugin.captions.regenTitle')}</p>
            <p className="text-[11px] text-gray-400">{t('plugin.captions.regenDesc')}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmRegen(false)} className="rounded-lg bg-[#202124] px-3 py-1.5 text-[11px] font-semibold text-gray-300 hover:bg-[#2a2b30]">{t('plugin.captions.cancel')}</button>
              <button onClick={confirmRegeneration} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-500">{t('plugin.captions.generateAction')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
/* eslint-enable react/only-export-components */

const autoCaptionsPlugin: PluginDefinition = {
  manifest: {
    id: 'auto-captions',
    name: 'Auto Captions',
    version: '1.2.0',
    description: 'Automatyczne generowanie napisów z materiałów wideo za pomocą Whisper AI.',
    author: 'ReVideeo',
    minApiVersion: 1,
    permissions: ['clips:read', 'clips:write', 'timeline:read', 'ui:tabs', 'ui:panels', 'storage:project'],
    entry: './index.tsx',
  },

  activate(context) {
    context.ui.registerTab({
      id: 'auto-captions:captions',
      label: 'Captions',
      icon: 'CC',
      position: 'media',
      priority: 10,
      render: () => React.createElement(CaptionsTab, { context }),
    });

    context.ui.registerHeaderButton({
      id: 'auto-captions:header',
      label: 'CC',
      icon: 'CC',
      position: 'after-export',
      priority: 5,
      onClick: () => {
        context.ui.showDialog({
          title: tStandalone('plugin.captions.autoCaptions'),
          content: tStandalone('plugin.captions.openTabHint'),
          actions: [{ label: 'OK', variant: 'primary', onClick: () => {} }],
        });
      },
    });

    context.ui.registerBottomBar({
      id: 'auto-captions:bottom-bar',
      label: 'Captions',
      icon: 'CC',
      priority: 5,
      onClick: () => {
        context.ui.showDialog({
          title: tStandalone('plugin.captions.autoCaptions'),
          content: tStandalone('plugin.captions.openTabHint'),
          actions: [{ label: 'OK', variant: 'primary', onClick: () => {} }],
        });
      },
    });

    console.log('[auto-captions] Plugin aktywowany');
  },

  deactivate() {
    console.log('[auto-captions] Plugin dezaktywowany');
  },
};

export default autoCaptionsPlugin;
