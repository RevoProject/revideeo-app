import { CheckCircle2, Sparkles, Zap, Shield } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface ReleaseChangesModalProps {
  version: string;
  onDismiss: () => void;
}

export const ReleaseChangesModal = ({ version, onDismiss }: ReleaseChangesModalProps) => {
  const { t } = useTranslation();

  const changes = [
    { icon: <Zap size={14} className="text-amber-400" />, key: 'migration' },
    { icon: <CheckCircle2 size={14} className="text-green-400" />, key: 'fixes' },
    { icon: <Shield size={14} className="text-blue-400" />, key: 'eupl' },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4">
      <div className="flex w-[480px] max-w-full flex-col gap-5 rounded-xl border border-[#2c2d33] bg-[#18191c] p-6 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 border border-blue-500/50">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('release.title')}</h2>
            <span className="mt-1 inline-block rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
              v{version}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {changes.map(({ icon, key }) => (
            <div key={key} className="flex items-start gap-3 rounded-lg border border-[#2c2d33] bg-[#202124] p-3">
              <div className="mt-0.5 shrink-0">{icon}</div>
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-bold text-white">{t(`release.${key}.title`)}</h3>
                <p className="text-[11px] leading-relaxed text-gray-400">{t(`release.${key}.desc`)}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-500 transition-colors"
        >
          {t('release.understand')}
        </button>
      </div>
    </div>
  );
};
