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
      <button type="button" onPointerDown={onFadeInPointerDown} className="absolute left-1 top-1/2 z-30 h-3 w-3 -translate-y-1/2 rounded-full border border-white/50 bg-blue-300/90 opacity-0 transition-opacity group-hover:opacity-100" title="Fade in" />
      <button type="button" onPointerDown={onFadeOutPointerDown} className="absolute right-1 top-1/2 z-30 h-3 w-3 -translate-y-1/2 rounded-full border border-white/50 bg-blue-300/90 opacity-0 transition-opacity group-hover:opacity-100" title="Fade out" />
    </>
  );
};
