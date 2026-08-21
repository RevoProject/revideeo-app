import { useTranslation } from '../../../i18n';

interface ClipTrimHandlesProps {
  disabled: boolean;
  onTrimLeftPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onTrimRightPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export const ClipTrimHandles = ({ disabled, onTrimLeftPointerDown, onTrimRightPointerDown }: ClipTrimHandlesProps) => {
  const { t } = useTranslation();
  if (disabled) return null;
  return (
    <>
      <div onPointerDown={onTrimLeftPointerDown} style={{ touchAction: 'none' }} className="absolute left-0 top-0 bottom-0 z-30 w-1 cursor-ew-resize bg-blue-300/70 hover:bg-white" title="Przytnij początek klipu" />
      <div onPointerDown={onTrimRightPointerDown} style={{ touchAction: 'none' }} className="absolute right-0 top-0 bottom-0 z-30 w-1 cursor-ew-resize bg-blue-300/70 hover:bg-white" title={t('timeline.trimEnd')} />
    </>
  );
};
