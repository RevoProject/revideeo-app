import { Download, FileVideo, Trash2 } from 'lucide-react';
import type { RecentExport } from '../../storage';
import { useTranslation } from '../../i18n';

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (createdAt: number): string => {
  try {
    return new Date(createdAt).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const RecentExportsMenu = ({
  exports,
  onDownload,
  onDelete,
  emptyLabel = 'Brak ostatnich eksportów',
}: {
  exports: RecentExport[];
  onDownload: (exp: RecentExport) => void;
  onDelete: (id: string) => void;
  emptyLabel?: string;
}) => {
  const { t } = useTranslation();
  if (exports.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-gray-500">{emptyLabel}</p>;
  }
  return (
    <div className="flex max-h-80 flex-col gap-1 overflow-y-auto p-2">
      {exports.map((exp) => (
        <div
          key={exp.id}
          className="group flex items-center gap-2 rounded-lg border border-[#2c2d33] bg-[#202124] px-2.5 py-2 hover:border-blue-500"
        >
          <FileVideo size={16} className="shrink-0 text-blue-400" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-gray-200">{exp.name}.{exp.format}</div>
            <div className="font-mono text-[10px] text-gray-500">
              {formatSize(exp.size)} · {formatDate(exp.createdAt)}
              {exp.downloaded && <span className="ml-1 text-blue-400">· {t('recentExports.downloaded')}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDownload(exp)}
            title={t('recentExports.download')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-500"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(exp.id)}
            title={t('recentExports.removeFromList')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-[#2a2b30] hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
