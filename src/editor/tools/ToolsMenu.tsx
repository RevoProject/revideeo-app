/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { AudioLines, Puzzle, Settings2, Shuffle, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

export type ToolView = 'properties' | 'transitions' | 'audio' | 'animations' | 'plugins';

interface ToolsMenuProps {
  onOpenProperties: () => void;
  onOpenTransitions: () => void;
  onOpenAudio: () => void;
  onOpenAnimations: () => void;
  onOpenPlugins: () => void;
}

const toolButton = 'flex items-center gap-2 rounded-lg bg-[#202124] px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-[#2a2b30] transition-colors';

export const ToolsMenu = ({
  onOpenProperties,
  onOpenTransitions,
  onOpenAudio,
  onOpenAnimations,
  onOpenPlugins,
}: ToolsMenuProps) => {
  const { t } = useTranslation();
  return (
  <div className="flex flex-1 flex-col gap-3 rounded-lg border border-[#2c2d33] bg-[#141517] p-3">
    <button onClick={onOpenProperties} className={toolButton}>
      <Settings2 size={14} className="text-blue-400" />
      {t('tools.properties')}
    </button>
    <button onClick={onOpenTransitions} className={toolButton}>
      <Shuffle size={14} className="text-blue-400" />
      {t('tools.transitions')}
    </button>
    <button onClick={onOpenAudio} className={toolButton}>
      <AudioLines size={14} className="text-blue-400" />
      {t('tools.audioMixer')}
    </button>
    <button onClick={onOpenAnimations} className={toolButton}>
      <Sparkles size={14} className="text-blue-400" />
      {t('tools.animations')}
    </button>
    <button onClick={onOpenPlugins} className={toolButton}>
      <Puzzle size={14} className="text-purple-400" />
      {t('tools.plugins')}
    </button>
  </div>
);
};
