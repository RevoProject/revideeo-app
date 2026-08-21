import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Server, ServerOff, TriangleAlert, Video, X } from 'lucide-react';
import type { VideoExportFormat } from '../../export/videoExporter';
import type { RenderServer } from '../../types';
import { RENDER_SERVER_BASE_URL } from '../../export/renderServerConfig';
import { useRenderServersStatus, type RenderServerOption } from '../../export/useRenderServersStatus';
import { useTranslation } from '../../i18n';

export const ExportFilmModal = ({
  totalFrames,
  contentFrames,
  fps,
  defaultName,
  servers,
  onExport,
  onClose,
  mobileUnavailable = false,
}: {
  totalFrames: number;
  contentFrames?: number;
  fps: number;
  servers: RenderServer[];
  onExport: (
    name: string,
    format: VideoExportFormat,
    startFrame: number,
    endFrame: number,
    serverUrl: string,
    onProgress: (p: number) => void,
    signal: AbortSignal,
  ) => Promise<void>;
  onClose: () => void;
  defaultName?: string;
  mobileUnavailable?: boolean;
}) => {
  const [name, setName] = useState(defaultName ?? 'revideeo-film');
  const [format, setFormat] = useState<VideoExportFormat>('mp4');
  const FPS = fps;
  const DEFAULT_MAX_FRAMES = FPS * 60 * 5; // 5 min
  const sensibleDefault = contentFrames ?? Math.min(totalFrames, DEFAULT_MAX_FRAMES);
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame, setEndFrame] = useState(sensibleDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { t } = useTranslation();

  const candidateServers: RenderServerOption[] = [
    { url: RENDER_SERVER_BASE_URL, label: RENDER_SERVER_BASE_URL.replace(/^https?:\/\//, '') },
    ...servers
      .filter((s) => s.url.trim())
      .map((s) => ({ url: s.url.trim(), label: s.alias?.trim() || s.url.trim() })),
  ].filter((server, index, all) => all.findIndex((other) => other.url === server.url) === index);
  const { checking, available } = useRenderServersStatus(candidateServers, 5000, !busy);
  const online = available.length >= 1;

  const [selectedServerUrl, setSelectedServerUrl] = useState<string | null>(null);
  useEffect(() => {
    if (available.length === 0) {
      setSelectedServerUrl(null);
    } else if (!available.some((s) => s.url === selectedServerUrl)) {
      setSelectedServerUrl(available[0].url);
    }
  }, [available, selectedServerUrl]);

  const clamp = (lo: number, value: number, hi: number) => Math.max(lo, Math.min(hi, value));
  const setEnd = (value: number) => setEndFrame(clamp(startFrame, Math.round(value || startFrame), totalFrames));
  const setStart = (value: number) => {
    const next = clamp(1, Math.round(value || 1), endFrame);
    setStartFrame(next);
  };

  const formatSeconds = (seconds: number): string => {
    const rounded = Math.round(seconds * 100) / 100;
    if (Number.isInteger(rounded)) return String(rounded);
    return String(rounded).replace(/\.?0+$/, '');
  };
  const parseTime = (raw: string): number | null => {
    const text = raw.trim();
    if (!text) return null;
    if (text.includes(':')) {
      const parts = text.split(':').map((p) => Number(p));
      if (parts.length < 2 || parts.length > 3 || parts.some((n) => Number.isNaN(n))) return null;
      const [a, b, c] = parts;
      return parts.length === 2 ? a * 60 + b : a * 3600 + b * 60 + (c ?? 0);
    }
    const value = Number(text);
    if (Number.isNaN(value)) return null;
    return value;
  };

  const [timeText, setTimeText] = useState(() => formatSeconds(sensibleDefault / FPS));
  const timeFocused = useRef(false);
  useEffect(() => {
    if (!timeFocused.current) setTimeText(formatSeconds(endFrame / FPS));
  }, [endFrame, FPS]);

  const endDurationSec = Math.round((endFrame / FPS) * 10) / 10;
  const renderedFrames = Math.max(1, endFrame - startFrame + 1);
  const renderedDurationSec = Math.round((renderedFrames / FPS) * 10) / 10;
  const timelineDurationSec = Math.round((totalFrames / FPS) * 10) / 10;
  const contentDurationSec = Math.round(((contentFrames ?? totalFrames) / FPS) * 10) / 10;
  const isTimelineLong = totalFrames > DEFAULT_MAX_FRAMES;

  useEffect(
    () => () => {
      if (abortRef.current) abortRef.current.abort();
    },
    [],
  );

  const handleClose = () => {
    if (abortRef.current) abortRef.current.abort();
    onClose();
  };

  const submit = async () => {
    if (!online) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      await onExport(
        name.trim() || 'revideeo-film',
        format,
        startFrame,
        endFrame,
        selectedServerUrl ?? available[0]?.url ?? '',
        (p) => setProgress(p),
        controller.signal,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(String(err));
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(0);
    }
  };

  const fmtLabel: Record<VideoExportFormat, string> = {
    mp4: 'MP4 (H.264)',
    mkv: 'MKV (VP9)',
    webm: 'WebM (VP9)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-[460px] flex-col gap-4 rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">{t('export.title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-300">
              <X size={18} />
            </button>
          </div>
        </div>

        {mobileUnavailable ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 px-4 text-center">
            <TriangleAlert size={64} strokeWidth={1.5} className="text-amber-400" />
            <div className="flex flex-col gap-2">
              <p className="text-lg font-bold text-white">{t('export.mobileUnavailable')}</p>
              <p className="text-sm text-gray-400">{t('export.mobileUnavailableDesc')}</p>
            </div>
          </div>
        ) : online ? (
          <div key="settings" className="fade-in flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-xs text-gray-400">
              {t('export.fileName')}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
                className="rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
              />
            </label>
            {available.length >= 2 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-gray-400">{t('export.renderServersLabel')}</span>
                <div className="grid grid-cols-2 gap-2">
                  {available.map((server) => (
                    <button
                      key={server.url}
                      type="button"
                      onClick={() => setSelectedServerUrl(server.url)}
                      disabled={busy}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold ${
                        selectedServerUrl === server.url
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : 'border-[#2c2d33] bg-[#202124] text-gray-400'
                      }`}
                    >
                      <Server size={14} className={selectedServerUrl === server.url ? 'text-white' : 'text-gray-500'} />
                      <span className="truncate">{server.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-gray-400">{t('export.format')}</span>
              <div className="grid grid-cols-3 gap-2">
                {(['mp4', 'mkv', 'webm'] as VideoExportFormat[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFormat(item)}
                    disabled={busy}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase ${
                      format === item ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#2c2d33] bg-[#202124] text-gray-400'
                    }`}
                  >
                    {fmtLabel[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setAdvanced((open) => !open)}
                className="flex items-center gap-1 text-xs text-gray-300 hover:text-white"
              >
                {advanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {t('export.advancedOptions')}
              </button>
              {advanced && (
                <div className="fade-in flex flex-col gap-3 border-l border-[#2c2d33] pl-3">
                  <label className="flex flex-col gap-2 text-xs text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>{t('export.frameCountEnd')}</span>
                      {isTimelineLong && (
                        <span className="text-[10px] text-amber-400">
                          {t('export.timelineLong', { timeline: timelineDurationSec, content: contentDurationSec })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={totalFrames}
                        value={endFrame}
                        onChange={(e) => setEnd(Number(e.target.value))}
                        disabled={busy}
                        className="flex-1 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                      />
                      <span className="whitespace-nowrap text-[10px] text-gray-500">{t('export.time')}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={timeText}
                        onChange={(e) => {
                          setTimeText(e.target.value);
                          const parsed = parseTime(e.target.value);
                          if (parsed !== null) setEnd(parsed * FPS);
                        }}
                        onFocus={() => {
                          timeFocused.current = true;
                        }}
                        onBlur={() => {
                          timeFocused.current = false;
                          setTimeText(formatSeconds(endFrame / FPS));
                        }}
                        disabled={busy}
                        className="w-20 rounded-lg border border-[#2c2d33] bg-[#202124] px-2 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                      />
                      <span className="text-[10px] text-gray-500">s</span>
                      {contentFrames && contentFrames !== totalFrames && (
                        <button
                          type="button"
                          onClick={() => setEnd(contentFrames)}
                          disabled={busy || endFrame === contentFrames}
                          className="whitespace-nowrap text-[10px] text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          {t('export.contentLabel', { content: contentDurationSec })}
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500">
                      ~{t('export.durationMaxInfo', { end: endDurationSec, timeline: timelineDurationSec, frames: totalFrames })}
                    </span>
                  </label>
                  <div className="flex flex-col gap-2 text-xs text-gray-400">
                    <span>{t('export.frameRange')}</span>
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-[10px] text-gray-500">{t('export.fromShort')}</span>
                      <input
                        type="number"
                        min={1}
                        max={endFrame}
                        value={startFrame}
                        onChange={(e) => setStart(Number(e.target.value))}
                        disabled={busy}
                        className="w-20 rounded-lg border border-[#2c2d33] bg-[#202124] px-2 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                      />
                      <span className="whitespace-nowrap text-[10px] text-gray-500">{t('export.toShort')}</span>
                      <input
                        type="number"
                        min={startFrame}
                        max={totalFrames}
                        value={endFrame}
                        onChange={(e) => setEnd(Number(e.target.value))}
                        disabled={busy}
                        className="w-20 rounded-lg border border-[#2c2d33] bg-[#202124] px-2 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setStartFrame(1);
                          setEndFrame(totalFrames);
                        }}
                        disabled={busy || (startFrame === 1 && endFrame === totalFrames)}
                        className="whitespace-nowrap text-[10px] text-blue-400 hover:text-blue-300 disabled:opacity-50"
                      >
                        {t('export.all')}
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {t('export.renderedInfo', { frames: renderedFrames, duration: renderedDurationSec })}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {busy && (
              <div className="flex flex-col gap-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2b30]">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-200"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{t('export.renderingProgress', { progress: Math.round(progress * 100) })}</span>
              </div>
            )}
            {error && <p className="rounded-lg bg-red-600/15 px-3 py-2 text-xs text-red-300">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={handleClose} className="px-3 py-2 text-xs text-gray-400">
                {busy ? t('export.cancel') : t('export.close')}
              </button>
              <button
                onClick={submit}
                disabled={busy || !online}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? t('export.rendering') : t('export.export')}
              </button>
            </div>
          </div>
        ) : (
          <div key="status" className="fade-in flex min-h-[220px] flex-col items-center justify-center gap-4 text-center">
            {checking ? (
              <>
                <Loader2 size={32} className="animate-spin text-amber-400" />
                <p className="text-sm text-gray-300">{t('export.checkingServer')}</p>
              </>
            ) : (
              <>
                <ServerOff size={32} className="text-red-500" />
                <div className="flex flex-col gap-2">
                  <p className="text-base font-bold text-white">{t('export.renderOffline')}</p>
                  <p className="max-w-[380px] text-xs text-gray-400">
                    {t('export.renderOfflineDesc')}
                  </p>
                  <div className="mt-1 flex flex-col gap-2 text-left">
                    <div className="flex gap-2 text-[11px]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">1</span>
                      <span className="text-gray-300">{t('export.step1')} <a href="https://github.com/RevoProject/revideeo-render-server" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">github.com/RevoProject/revideeo-render-server</a></span>
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">2</span>
                      <span className="text-gray-300">{t('export.step2')}</span>
                    </div>
                    <pre className="ml-7 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-[11px] text-green-300">
                      pnpm run dev --host
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
