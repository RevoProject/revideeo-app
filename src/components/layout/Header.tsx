import { useState } from 'react';
import { Clapperboard, Download, FileDown, FileUp, Info, Plus, Redo2, Save, Settings2, Undo2, Video as VideoIcon } from 'lucide-react';
import type { OpenProject } from '../../editor/editorTypes';
import type { RecentExport } from '../../storage';
import { RecentExportsMenu } from '../shared/RecentExportsMenu';
import { useTranslation } from '../../i18n';

interface HeaderProps {
  project: OpenProject;
  preset: { label: string; width: number; height: number };
  dirty: boolean;
  saveLabel?: string;
  onExport: () => void;
  onExportProject: () => void;
  onSave: () => void;
  onImport: () => void;
  onJuicer: () => void;
  onNewProject: () => void;
  onLogoClick: () => void;
  onOpenSettings: () => void;
  onShowShortcuts: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  recentExports: RecentExport[];
  onDownloadRecent: (exp: RecentExport) => void;
  onDeleteRecent: (id: string) => void;
}

export const Header = ({
  project,
  preset,
  dirty,
  saveLabel,
  onExport,
  onExportProject,
  onSave,
  onImport,
  onJuicer,
  onNewProject,
  onLogoClick,
  onOpenSettings,
  onShowShortcuts,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  recentExports,
  onDownloadRecent,
  onDeleteRecent,
}: HeaderProps) => {
  const [exportsOpen, setExportsOpen] = useState(false);
  const pendingCount = recentExports.filter((exp) => !exp.downloaded).length;
  const { t } = useTranslation();
  const resolvedSaveLabel = saveLabel ?? t('header.save');
  return (
  <header className="h-16 shrink-0 bg-[#18191c] border-b border-[#222429] px-4 flex items-center gap-3">
    <button onClick={onLogoClick} title={t('header.goToStart')} className="flex items-center gap-2.5 cursor-pointer">
      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
        <Clapperboard size={20} className="text-white" />
      </div>
      <div className="flex flex-col leading-tight">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Re<span className="text-blue-500">Videeo</span>
        </h1>
      </div>
    </button>
      <button onClick={onNewProject} title={t('header.newProject')} className="w-9 h-9 rounded-lg bg-[#202124] hover:bg-[#2a2b30] flex items-center justify-center text-gray-300">
        <Plus size={16} />
      </button>
      <div className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202124] max-w-52">
        <span className="text-xs font-semibold text-gray-300 truncate">{project.name}</span>
      </div>
      <button onClick={onImport} title={t('header.importProject')} className="flex items-center gap-1.5 bg-[#202124] hover:bg-[#2a2b30] px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300">
        <FileUp size={14} />Import
      </button>
      <button onClick={onJuicer} title={t('header.juicer')} className="flex items-center gap-1.5 bg-[#202124] hover:bg-[#2a2b30] px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300">
        <span className="text-sm leading-none">🍹</span>Juicer
      </button>
    <div className="ml-auto flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setExportsOpen((value) => !value)}
          title={t('header.recentExports')}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#202124] text-gray-300 hover:bg-[#2a2b30]"
        >
          <Download size={16} />
          {pendingCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </button>
        {exportsOpen && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setExportsOpen(false)} />
            <div className="absolute right-0 top-full z-[71] mt-2 w-72 overflow-hidden rounded-xl border border-[#363941] bg-[#1F222A] shadow-2xl">
              <div className="border-b border-[#2c2f37] px-3 py-2 text-xs font-bold tracking-wider text-gray-300">
                {t('header.recentExports')}
              </div>
              <RecentExportsMenu
                exports={recentExports}
                onDownload={onDownloadRecent}
                onDelete={onDeleteRecent}
                emptyLabel={t('header.noExports')}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title={t('header.undo')}
          className="w-9 h-9 rounded-lg bg-[#202124] hover:bg-[#2a2b30] flex items-center justify-center text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title={t('header.redo')}
          className="w-9 h-9 rounded-lg bg-[#202124] hover:bg-[#2a2b30] flex items-center justify-center text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Redo2 size={16} />
        </button>
      </div>
      <button onClick={onExport} title={t('header.exportFilm')} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-bold text-white">
        <VideoIcon size={14} />{t('header.exportFilm')}
      </button>
      <button onClick={onExportProject} title={t('header.exportProject')} className="flex items-center gap-1.5 bg-[#202124] hover:bg-[#2a2b30] px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300">
        <FileDown size={14} />{t('header.export')}
      </button>
      <button
        onClick={onSave}
        title={t('header.saveLocal')}
        className={`flex items-center gap-1.5 bg-[#202124] hover:bg-[#2a2b30] px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 ${dirty ? 'ring-1 ring-amber-400 ring-offset-1 ring-offset-[#18191c]' : ''}`}
      >
        <Save size={14} />{resolvedSaveLabel}
      </button>
      <div className="px-3 py-1.5 rounded-lg bg-[#202124] text-xs font-mono text-gray-300">{preset.label} · {project.config.orientation} · {preset.width}×{preset.height}</div>
      <button onClick={onShowShortcuts} title={t('header.shortcuts')} className="w-9 h-9 rounded-lg bg-[#202124] flex items-center justify-center text-gray-300">
        <Info size={16} />
      </button>
      <button onClick={onOpenSettings} title={t('header.settings')} className="w-9 h-9 rounded-lg bg-[#202124] flex items-center justify-center text-gray-300">
        <Settings2 size={16} />
      </button>
    </div>
  </header>
  );
};
