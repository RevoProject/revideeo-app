/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { useRef } from 'react';
import type { StoredClip } from '../../types';

export const PreviewTransformOverlay = ({ clip, trackName, compositionWidth, compositionHeight, onBeginEdit, onUpdate }: { clip: StoredClip | null; trackName: string; compositionWidth: number; compositionHeight: number; onBeginEdit: () => void; onUpdate: (patch: Partial<StoredClip>) => void }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  if (!clip) return null;

  const beginPointer = (event: React.PointerEvent<HTMLElement>, mode: 'move' | 'resize') => {
    event.preventDefault();
    event.stopPropagation();
    if (pointerRef.current !== null) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onBeginEdit();
    const bounds = overlayRef.current?.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = clip.posX;
    const initialY = clip.posY ?? 0;
    const initialWidth = clip.width ?? 100;
    const initialHeight = clip.height ?? 100;
    const clipScale = clip.scale || 1;
    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerRef.current) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (mode === 'move') {
        onUpdate({ posX: Math.max(-compositionWidth, Math.min(compositionWidth, initialX + (dx / bounds.width) * compositionWidth)), posY: Math.max(-compositionHeight, Math.min(compositionHeight, initialY + (dy / bounds.height) * compositionHeight)) });
      } else {
        const widthDelta = (dx / bounds.width) * 100 / clipScale;
        const heightDelta = (dy / bounds.height) * 100 / clipScale;
        const nextWidth = Math.max(5, Math.min(300, initialWidth + widthDelta));
        const nextHeight = Math.max(5, Math.min(300, initialHeight + heightDelta));
        const acceptedWidthDelta = nextWidth - initialWidth;
        const acceptedHeightDelta = nextHeight - initialHeight;
        onUpdate({
          width: nextWidth,
          height: nextHeight,
          // Keep the top-left corner anchored while the center-based layer grows.
          posX: initialX + (acceptedWidthDelta / 100 * compositionWidth) / 2,
          posY: initialY + (acceptedHeightDelta / 100 * compositionHeight) / 2,
        });
      }
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointercancel', handleUp);
      pointerRef.current = null;
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
    window.addEventListener('pointercancel', handleUp, { once: true });
  };

  const width = clip.width ?? 100;
  const height = clip.height ?? 100;
  const positionX = clip.posX ?? 0;
  const positionY = clip.posY ?? 0;
  const scale = clip.scale || 1;
  return <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20 overflow-visible">
    <div className="pointer-events-auto absolute box-border border border-blue-400 bg-blue-400/5" style={{ left: `${50 + (positionX / compositionWidth) * 100}%`, top: `${50 + (positionY / compositionHeight) * 100}%`, width: `${width}%`, height: `${height}%`, transform: `translate(-50%, -50%) rotate(${clip.rotation ?? 0}deg) scale(${scale})`, transformOrigin: 'center center', touchAction: 'none', userSelect: 'none' }} onPointerDown={(event) => beginPointer(event, 'move')}>
      <span className="absolute -left-px -top-5 max-w-48 truncate rounded bg-blue-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">{trackName}</span>
      <span className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-blue-500" onPointerDown={(event) => beginPointer(event, 'resize')} />
    </div>
  </div>;
};
