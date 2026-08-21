import { useState } from 'react';
import { X } from 'lucide-react';
import type { ProjectConfig } from '../../types';
import type { OpenProject } from '../../editor/editorTypes';
import { ResolutionPicker, type ResolutionOption } from '../shared/ResolutionPicker';
import { useTranslation } from '../../i18n';

export const SettingsModal = ({ project, resolutions, onConfirm, onClose }: { project: OpenProject; resolutions: ResolutionOption[]; onConfirm: (name: string, config: ProjectConfig) => void; onClose: () => void }) => {
  const [name, setName] = useState(project.name);
  const [config, setConfig] = useState(project.config);
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-[440px] max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{t('projectSettings.title')}</h2>
          <button onClick={onClose} className="text-gray-500"><X size={18} /></button>
        </div>
        <label className="flex flex-col gap-2 text-xs text-gray-400">
          {t('projectSettings.name')}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-[#2c2d33] bg-[#202124] px-3 py-2 text-sm text-gray-200 outline-none"
          />
        </label>
        <ResolutionPicker config={config} resolutions={resolutions} onChange={setConfig} />
        <button onClick={() => onConfirm(name.trim() || project.name, config)} className="rounded-lg bg-blue-600 p-3 text-xs font-bold text-white">{t('projectSettings.save')}</button>
      </div>
    </div>
  );
};
