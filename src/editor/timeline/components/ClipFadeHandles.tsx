/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

interface ClipFadeHandlesProps {
  disabled: boolean;
  onFadeInPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onFadeOutPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export const ClipFadeHandles = ({ disabled, onFadeInPointerDown, onFadeOutPointerDown }: ClipFadeHandlesProps) => {
  if (disabled) return null;
  return (
    <>
      <button type="button" data-fade-handle="in" onPointerDown={onFadeInPointerDown} className="absolute left-0 top-0 z-40 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/30 transition-all group-hover:bg-blue-300/95 group-hover:border-white/70 hover:bg-white cursor-ew-resize" title="Fade in" />
      <button type="button" data-fade-handle="out" onPointerDown={onFadeOutPointerDown} className="absolute right-0 top-0 z-40 h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/30 transition-all group-hover:bg-blue-300/95 group-hover:border-white/70 hover:bg-white cursor-ew-resize" title="Fade out" />
    </>
  );
};
