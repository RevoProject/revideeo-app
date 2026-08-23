/*
 * Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
 * Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
 * See LICENSE file in the project root for full license information.
 */

import { ArrowRightLeft } from 'lucide-react';

interface TransitionHandleProps {
  left: string;
  width: string;
  title: string;
  label?: string;
  top?: string;
  bottom?: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const TransitionHandle = ({ left, width, title, label, top = '0', bottom = '0', onPointerDown, onDoubleClick, onContextMenu }: TransitionHandleProps) => (
  <div
    onPointerDown={onPointerDown}
    onDoubleClick={onDoubleClick}
    onContextMenu={onContextMenu}
    style={{ left, width, top, bottom, touchAction: 'none', zIndex: 25 }}
    title={title}
    className="absolute flex items-center justify-center gap-0.5 cursor-ew-resize"
  >
    <div
      className="absolute inset-0 rounded-sm"
      style={{
        backgroundColor: 'rgba(192, 38, 211, 0.85)',
        boxShadow: '0 0 12px rgba(217, 70, 239, 0.6), inset 0 0 6px rgba(217, 70, 239, 0.3)',
        border: '1px solid rgba(232, 121, 249, 0.9)',
      }}
    />
    <div className="relative z-10 flex items-center gap-0.5">
      <ArrowRightLeft size={10} className="shrink-0 text-white drop-shadow" />
      {label && (
        <span className="text-[8px] font-mono leading-none text-white truncate pointer-events-none max-w-[60px] drop-shadow">
          {label}
        </span>
      )}
    </div>
  </div>
);
