import type { StoredClip, TransitionType } from '../../types';
import { useTranslation } from '../../i18n';

export interface TransitionOption {
  type: TransitionType;
  label: string;
}

interface TransitionSettingsProps {
  activeClip: StoredClip | null;
  clipIndex: number;
  transitionTypes: TransitionOption[];
  minDuration: number;
  maxDuration: number;
  onSetTransitionType: (id: string, type: TransitionType) => void;
  onSetTransitionDuration: (id: string, frames: number) => void;
}

export const TransitionSettings = ({
  activeClip,
  clipIndex,
  transitionTypes,
  minDuration,
  maxDuration,
  onSetTransitionType,
  onSetTransitionDuration,
}: TransitionSettingsProps) => {
  const { t } = useTranslation();

  if (!activeClip) {
    return <p className="rounded bg-[#202124] p-2 text-xs text-gray-500">{t('transition.selectClip')}</p>;
  }

  const hasPrevious = clipIndex > 0;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold tracking-wider text-gray-400">{t('transition.title')}</span>
      {!hasPrevious && (
        <p className="rounded bg-[#202124] p-2 text-xs text-gray-500">{t('transition.noPrevious')}</p>
      )}
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#202124] p-1">
        {transitionTypes.map((transition) => (
          <button
            key={transition.type}
            onClick={() => onSetTransitionType(activeClip.id, transition.type)}
            disabled={!hasPrevious}
            className={`rounded-md px-1 py-1.5 text-[10px] font-semibold transition-colors ${activeClip.transitionIn === transition.type ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {transition.label}
          </button>
        ))}
      </div>
      <label className="flex justify-between text-xs text-gray-400">
        <span>{t('transition.duration')}</span>
        <span className="text-blue-400">{activeClip.transitionDurationInFrames} kl.</span>
      </label>
      <input
        type="range"
        min={minDuration}
        max={maxDuration}
        step="1"
        value={activeClip.transitionDurationInFrames}
        disabled={activeClip.transitionIn === 'none' || !hasPrevious}
        onChange={(event) => onSetTransitionDuration(activeClip.id, parseInt(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-[#2a2b30] disabled:opacity-40"
      />
    </div>
  );
};
