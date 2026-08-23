/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

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
