import { FileUp, FolderOpen, Plus, Server, Settings, X } from 'lucide-react';
import { useState } from 'react';
import type { StoredProject } from '../../types';
import type { ResolutionOption } from '../shared/ResolutionPicker';
import type { RemoteProjectSummary } from '../../export/renderClient';
import { useTranslation } from '../../i18n';

interface StartModalProps {
  projects: StoredProject[];
  resolutions: ResolutionOption[];
  canGoBack: boolean;
  mobile?: boolean;
  onOpen: (project: StoredProject) => void;
  onMore: () => void;
  onImport: () => void;
  onNew: () => void;
  onOpenAppSettings: () => void;
  onClose: () => void;
  remoteProjects: RemoteProjectSummary[];
  remoteChecking: boolean;
  remoteError: string | null;
  onOpenRemote: (project: RemoteProjectSummary) => void;
}

export const StartModal = ({ projects, resolutions, canGoBack, mobile = false, onOpen, onMore, onImport, onNew, onOpenAppSettings, onClose, remoteProjects, remoteChecking, remoteError, onOpenRemote }: StartModalProps) => {
  const [tab, setTab] = useState<'local' | 'remote'>('local');
  const { t } = useTranslation();
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <div className={`flex ${mobile ? 'w-full' : 'w-[560px]'} max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{t('start.title')}</h2>
        {canGoBack && <button onClick={onClose} className="text-gray-500"><X size={18} /></button>}
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#202124] p-1">
        <button onClick={() => setTab('local')} className={`rounded-md px-3 py-2 text-xs font-bold ${tab === 'local' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{t('start.local')}</button>
        <button onClick={() => setTab('remote')} className={`flex items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-bold ${tab === 'remote' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}><Server size={13} /> {t('start.remote')}</button>
      </div>
      {tab === 'remote' ? (
         remoteChecking ? <p className="rounded-lg bg-[#202124] p-3 text-xs text-gray-400">{t('start.checkingRemote')}</p> : remoteError ? <p className="rounded-lg bg-red-600/15 p-3 text-xs text-red-300">{remoteError}</p> : remoteProjects.length ? <div className="flex flex-col gap-2">{remoteProjects.map((remote) => <button key={remote.id} onClick={() => onOpenRemote(remote)} className="flex items-center justify-between gap-3 rounded-lg border border-[#2c2d33] bg-[#202124] px-4 py-3 text-left"><span className="flex min-w-0 items-center gap-3"><Server size={18} className="text-purple-400" /><span className="truncate text-sm font-semibold text-gray-200">{remote.name}<small className="block text-xs text-gray-500">{remote.assets} assetów · zapisano {remote.savedAt ? new Date(remote.savedAt).toLocaleString() : 'brak daty'}</small></span></span><span className="text-xs font-semibold text-blue-400">{t('start.load')}</span></button>)}</div> : <p className="rounded-lg bg-[#202124] p-3 text-xs text-gray-500">{t('start.noRemoteProjects')}</p>
      ) : projects.length ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-wider text-gray-400">{t('start.recentProjects')}</span>
          {projects.slice(0, 4).map((project) => {
            const resolution = resolutions.find((item) => item.label === project.config.resolutionLabel) ?? resolutions[0];
            return (
              <button key={project.id} onClick={() => onOpen(project)} className="flex items-center justify-between gap-3 rounded-lg border border-[#2c2d33] bg-[#202124] px-4 py-3 text-left">
                <span className="flex min-w-0 items-center gap-3">
                  <FolderOpen size={18} className="text-blue-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-200">{project.name}</span>
                    <span className="text-xs text-gray-500">{resolution.label} · {project.config.orientation} · {new Date(project.savedAt).toLocaleString()}</span>
                  </span>
                </span>
                <span className="text-xs font-semibold text-blue-400">{t('start.open')}</span>
              </button>
            );
          })}
          {projects.length > 4 && <button onClick={onMore} className="rounded-lg bg-[#202124] px-3 py-2 text-xs text-gray-300">{t('start.more', { count: projects.length })}</button>}
        </div>
      ) : (
        <p className="rounded-lg bg-[#202124] p-3 text-xs text-gray-500">{t('start.noProjects')}</p>
      )}
      <p className="text-center text-[11px] text-gray-500">{t('start.footer')}</p>
      <button onClick={onOpenAppSettings} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#202124] px-3 py-2.5 text-xs font-semibold text-gray-300 hover:bg-[#2a2b30]">
        <Settings size={14} />
        {t('start.settings')}
      </button>
      <div className={`flex ${mobile ? 'flex-col' : 'flex-row'} gap-2`}>
        <button onClick={onImport} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#202124] px-3 py-2.5 text-xs font-semibold text-gray-300">
          <FileUp size={14} />
          {t('start.import')}
        </button>
        <button onClick={onNew} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white">
          <Plus size={14} />
          {t('start.newProject')}
        </button>
        {canGoBack && <button onClick={onClose} className="px-3 py-2.5 text-xs text-gray-400">{t('start.back')}</button>}
      </div>
    </div>
  </div>
  );
};
