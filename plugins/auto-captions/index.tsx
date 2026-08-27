import type { PluginDefinition, PluginContext } from '../../src/api/types';
import React from 'react';
import { useTranslation, detectLanguage } from '../../src/i18n';
import plTranslations from '../../src/i18n/pl.json';
import enTranslations from '../../src/i18n/en.json';
import deTranslations from '../../src/i18n/de.json';
import type { Caption, TranscriptionParams } from './types';
import { asTranscriptionResult, buildProcessingParams } from './transcription';
import { segmentsToCaptions, formatTime } from './utils';

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

/* eslint-disable react/only-export-components */
const CaptionsTab = ({ context }: { context: PluginContext }) => {
  const [lang, setLang] = React.useState('pl');
  const [model, setModel] = React.useState('small');
  const [fontSize, setFontSize] = React.useState('48');
  const [generating, setGenerating] = React.useState(false);
  const [captions, setCaptions] = React.useState<Caption[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = React.useState(false);
  const { t } = useTranslation();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const fps = context.frame?.getContext().fps ?? context.project.getConfig().fps ?? 30;

      const media = context.media?.list() ?? [];
      const transcribable = media.filter((m) => m.kind === 'video' || m.kind === 'audio');
      if (transcribable.length === 0) {
        setError('No video or audio assets found. Import media first.');
        setGenerating(false);
        return;
      }

      const allClips = context.clips.getAll();
      const targetClips = allClips.filter(
        (c) => c.type !== 'text' && c.type !== 'image' && transcribable.some((m) => m.id === c.sourceId),
      );

      if (targetClips.length === 0) {
        setError('No video/audio clips found on the timeline.');
        setGenerating(false);
        return;
      }

      const mediaIds = [...new Set(targetClips.map((c) => c.sourceId))];
      const params: TranscriptionParams = {
        language: lang as TranscriptionParams['language'],
        model: model as TranscriptionParams['model'],
      };

      const result = await context.processing?.processMedia(mediaIds, 'transcribe', buildProcessingParams(params));

      if (!result) {
        setError('Transcription unavailable. Check that a render server is configured.');
        setGenerating(false);
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setGenerating(false);
        return;
      }

      const tracks = context.project.getTrackSettings();
      let captionsTrackIndex = tracks.findIndex((t) => t.name === 'CAPTIONS');
      if (captionsTrackIndex === -1) {
        captionsTrackIndex = tracks.length;
      }

      const allCaptions: Caption[] = [];
      const results = Array.isArray(result.data) ? result.data : [result.data];

      for (let i = 0; i < targetClips.length; i++) {
        const clip = targetClips[i];
        const mediaResult = results[i] ?? results[0];
        if (!mediaResult) continue;

        const transcription = asTranscriptionResult({ ok: true, processor: 'transcribe', data: mediaResult }, clip.id);
        if (!transcription) continue;

        const clipCaptions = segmentsToCaptions(transcription.segments, clip.offsetInTimeline, fps);
        allCaptions.push(...clipCaptions);
      }

      for (const cap of allCaptions) {
        context.clips.add({
          type: 'text',
          sourceId: cap.id,
          trackIndex: captionsTrackIndex,
          offsetInTimeline: cap.startFrame,
          startFrame: 0,
          durationInFrames: cap.durationFrames,
          scale: 1,
          posX: 0,
          posY: 0,
          width: 80,
          height: 16,
          text: cap.text,
          fontSize: Number(fontSize),
          fontWeight: 600,
          textColor: '#ffffff',
          textAlign: 'center',
          transitionIn: 'none',
          transitionDurationInFrames: 0,
          opacity: 1,
        });
      }

      setCaptions(allCaptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during transcription');
    } finally {
      setGenerating(false);
    }
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

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
          {error}
        </div>
      )}

      {captions.length > 0 && (
        <button onClick={() => setConfirmRegen(true)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-[10px] font-semibold text-gray-400 hover:bg-[#2a2b30] hover:text-gray-200 transition-colors sm:text-[11px]">
          {t('plugin.captions.retryGeneration')}
        </button>
      )}

      <button onClick={() => void handleGenerate()} disabled={generating} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-500 active:bg-blue-400 transition-colors disabled:opacity-50">
        {generating ? t('plugin.captions.generating') : t('plugin.captions.generate')}
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
                <span className="shrink-0 font-mono text-[9px] text-gray-500 pt-px">{formatTime(c.startFrame / (context.frame?.getContext().fps ?? 30))}</span>
                <span className="min-w-0 flex-1 text-[10px] leading-snug text-gray-300 sm:text-[11px]">{c.text}</span>
                <span className="shrink-0 font-mono text-[9px] text-gray-600 pt-px">{formatTime((c.startFrame + c.durationFrames) / (context.frame?.getContext().fps ?? 30))}</span>
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
              <button onClick={() => { setConfirmRegen(false); setCaptions([]); void handleGenerate(); }} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-500">{t('plugin.captions.generateAction')}</button>
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
    version: '2.0.0',
    description: 'Automatyczne generowanie napisów z materiałów wideo za pomocą Whisper AI.',
    author: 'ReVideeo',
    minApiVersion: 1,
    permissions: ['clips:read', 'clips:write', 'timeline:read', 'frame:read', 'media:read', 'processing:execute', 'ui:tabs', 'ui:panels', 'storage:project'],
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
  },

  deactivate() {
    // cleanup if needed
  },
};

export default autoCaptionsPlugin;
