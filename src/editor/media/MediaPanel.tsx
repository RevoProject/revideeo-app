import { useState } from 'react';
import { CheckCircle2, FileText, Image as ImageIcon, Loader2, Music2, Puzzle, Upload, Video as VideoIcon } from 'lucide-react';
import type { MediaAsset } from '../editorTypes';
import type { TabRegistration } from '../../api/types';
import { useTranslation } from '../../i18n';

interface MediaImportProgress {
  total: number;
  done: number;
  name: string;
}

type DesktopTab = 'media' | 'text' | (string & {});

interface MediaPanelProps {
  assets: MediaAsset[];
  selectedTrack: number;
  trackCount?: number;
  onSelectTrack?: (track: number) => void;
  mobile?: boolean;
  width?: number;
  loading?: MediaImportProgress | null;
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFilesDropped: (files: File[]) => void;
  onPlaceAsset: (sourceId: string) => void;
  onAddText?: () => void;
  onContextMenuAsset: (event: React.MouseEvent, sourceId: string) => void;
  pluginTabs?: TabRegistration[];
}

export const MediaPanel = ({ assets, selectedTrack, trackCount, onSelectTrack, mobile = false, width, loading, onFilesSelected, onFilesDropped, onPlaceAsset, onAddText, onContextMenuAsset, pluginTabs = [] }: MediaPanelProps) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [desktopTab, setDesktopTab] = useState<DesktopTab>('media');
  const { t } = useTranslation();
  const desktopClass = width ? 'border-r border-[#2c2d33] p-4' : 'w-80 border-r border-[#2c2d33] p-4';
  const importPercent = loading ? Math.round((loading.done / Math.max(1, loading.total)) * 100) : 0;
  const importDone = loading ? loading.done >= loading.total : false;
  const videoAssets = assets.filter((asset) => !asset.blob.type.startsWith('audio/') && !asset.blob.type.startsWith('image/'));
  const audioAssets = assets.filter((asset) => asset.blob.type.startsWith('audio/'));
  const imageAssets = assets.filter((asset) => asset.blob.type.startsWith('image/'));

  const onSelectAsset = (sourceId: string) => {
    if (mobile) setSelectedSourceId((previous) => (previous === sourceId ? null : sourceId));
    else onPlaceAsset(sourceId);
  };

  const renderAsset = (asset: MediaAsset) => (
    <div key={asset.sourceId} draggable={!mobile} onDragStart={(event) => event.dataTransfer.setData('application/x-revideeo', asset.sourceId)} onClick={() => onSelectAsset(asset.sourceId)} onContextMenu={(event) => onContextMenuAsset(event, asset.sourceId)} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border bg-[#202124] px-3 py-2 hover:bg-[#2a2b30] ${mobile && selectedSourceId === asset.sourceId ? 'border-blue-500 ring-2 ring-blue-500' : 'border-[#2c2d33]'}`}>
      {asset.blob.type.startsWith('audio/') ? <Music2 size={16} className="shrink-0 text-pink-400" /> : asset.blob.type.startsWith('image/') ? <ImageIcon size={16} className="shrink-0 text-amber-400" /> : asset.thumbnails?.length ? <img src={asset.thumbnails[Math.floor(asset.thumbnails.length / 2)]} alt="" className="h-9 w-14 shrink-0 rounded bg-black object-cover" /> : <VideoIcon size={16} className="shrink-0 text-blue-400" />}
      <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-gray-200">{asset.name}</div><div className="font-mono text-[10px] text-gray-500">{(asset.durationInFrames / 30).toFixed(1)}s</div></div>
    </div>
  );

  const renderGroup = (label: string, group: MediaAsset[]) => group.length > 0 && <div className="flex flex-col gap-2"><div className="flex items-center gap-2 border-b border-[#3a3f47] pb-1"><span className="text-[10px] font-bold tracking-wider text-gray-400">{label}</span><div className="h-px flex-1 bg-[#2c2d33]" /></div>{group.map(renderAsset)}</div>;
  const hasMultipleMediaTypes = [videoAssets, audioAssets, imageAssets].filter((group) => group.length > 0).length > 1;

  const activePluginTab = pluginTabs.find((tab) => tab.id === desktopTab);

  return <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onFilesDropped(Array.from(event.dataTransfer.files)); }} className={`${mobile ? 'h-full w-full border-0 p-3' : desktopClass} relative flex min-w-0 flex-col gap-4 bg-[#18191c]`} style={!mobile && width ? { width } : undefined}>
    {loading && <div className="absolute inset-x-0 top-0 z-10"><div className="h-1 w-full overflow-hidden bg-[#2a2b30]"><div className={`h-full transition-all duration-200 ${importDone ? 'bg-green-500' : 'bg-red-600'}`} style={{ width: `${importDone ? 100 : Math.max(8, importPercent)}%` }} /></div></div>}
    {loading && <div className="flex items-center gap-2 rounded-lg bg-[#202124] px-3 py-2 text-xs text-gray-300">{importDone ? <CheckCircle2 size={14} className="shrink-0 text-green-400" /> : <Loader2 size={14} className="shrink-0 animate-spin text-red-400" />}<span className="min-w-0 flex-1 truncate">{importDone ? t('media.loading') : loading.total > 1 ? t('media.loadingMulti', { done: String(loading.done + 1), total: String(loading.total), name: loading.name }) : t('media.loadingSingle', { name: loading.name })}</span></div>}
    {!mobile && (
      <div className={`grid gap-2 ${pluginTabs.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <button type="button" onClick={() => setDesktopTab('media')} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${desktopTab === 'media' ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#2c2d33] bg-[#202124] text-gray-400'}`}><VideoIcon size={15} />{t('media.media')}</button>
        <button type="button" onClick={() => setDesktopTab('text')} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${desktopTab === 'text' ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#2c2d33] bg-[#202124] text-gray-400'}`}><span className="font-bold">T</span>{t('media.text')}</button>
        {pluginTabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setDesktopTab(tab.id)} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${desktopTab === tab.id ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#2c2d33] bg-[#202124] text-gray-400'}`}><Puzzle size={15} />{tab.label}</button>
        ))}
      </div>
    )}
    {!mobile && activePluginTab ? (
      <div className="flex min-h-0 flex-1 overflow-y-auto">{activePluginTab.render()}</div>
    ) : !mobile && desktopTab === 'text' ? (
      <button type="button" onClick={onAddText} className="flex items-center gap-3 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-3 text-left hover:border-blue-500 hover:bg-[#2a2b30]"><FileText size={20} className="text-blue-400" /><span><span className="block text-xs font-semibold text-gray-200">{t('media.standardText')}</span><span className="block text-[10px] text-gray-500">{t('media.addTextDesc')}</span></span></button>
    ) : <>
      {mobile ? <div className="flex items-stretch gap-2"><label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-3 py-2.5 text-xs font-semibold text-white active:bg-blue-500"><Upload size={16} />{t('media.addFiles')}<input type="file" accept="video/*,audio/*,image/*" multiple className="hidden" onChange={onFilesSelected} /></label><button type="button" disabled={!selectedSourceId} onClick={() => { if (selectedSourceId) { onPlaceAsset(selectedSourceId); setSelectedSourceId(null); } }} className={`flex flex-1 items-center justify-center rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${selectedSourceId ? 'bg-[#2563EB] text-white active:bg-blue-500' : 'cursor-not-allowed bg-[#202124] text-gray-600'}`}>{t('media.insert', { track: String(selectedTrack + 1) })}</button></div> : <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#3a3f47] bg-[#202124] hover:border-blue-500"><Upload size={22} className="text-gray-500" /><span className="text-xs text-gray-400">{t('media.dropHere')}</span><input type="file" accept="video/*,audio/*,image/*" multiple className="hidden" onChange={onFilesSelected} /></label>}
      {mobile && <button type="button" onClick={onAddText} className="flex items-center justify-center gap-2 rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2.5 text-xs font-semibold text-gray-200 active:border-blue-500 active:bg-[#2a2d34]"><span className="font-bold text-blue-400">T</span>{t('media.standardText')}</button>}
    </>}
    {mobile && trackCount ? <div className="flex items-center gap-2"><span className="shrink-0 text-[11px] text-gray-400">{t('media.target')}</span><div className="flex flex-1 gap-1.5 overflow-x-auto">{Array.from({ length: trackCount }, (_, index) => <button key={index} type="button" onClick={() => onSelectTrack?.(index)} className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${selectedTrack === index ? 'bg-[#2563EB] text-white' : 'bg-[#202124] text-gray-400 hover:text-gray-200'}`}>V{index + 1}</button>)}</div></div> : null}
    {(mobile || desktopTab === 'media') && <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">{assets.length === 0 ? <p className="rounded-lg bg-[#202124] p-3 text-xs text-gray-600">{mobile ? t('media.emptyMobile') : t('media.emptyDesktop')}</p> : hasMultipleMediaTypes ? <>{renderGroup(t('media.video'), videoAssets)}{renderGroup(t('media.audio'), audioAssets)}{renderGroup(t('media.images'), imageAssets)}</> : assets.map(renderAsset)}</div>}
  </div>;
};
