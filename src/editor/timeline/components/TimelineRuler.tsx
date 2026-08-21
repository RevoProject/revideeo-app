import React from 'react';
import { getRulerStepSeconds } from '../utils/timelineGeometry';

interface TimelineRulerProps {
  totalFrames: number;
  fps: number;
  zoom: number;
  onPointerDown?: () => void;
  onDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const TimelineRuler = ({ totalFrames, fps, zoom, onPointerDown, onDoubleClick }: TimelineRulerProps) => {
  const step = getRulerStepSeconds(totalFrames, fps);
  const marks = Array.from({ length: Math.floor(totalFrames / (step * fps)) + 1 }, (_, index) => {
    const seconds = index * step;
    return { frame: Math.min(totalFrames, Math.round(seconds * fps)), label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` };
  });
  return (
    <div className="relative h-8 border-b border-[#2d3037] bg-[#18191c] text-[10px] text-gray-500" style={{ minWidth: `${zoom * 100}%`, width: zoom < 1 ? `${zoom * 100}%` : undefined }} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick}>
      {marks.map((mark) => <div key={mark.frame} className="absolute top-0 h-full border-l border-[#34363d]" style={{ left: `${(mark.frame / totalFrames) * 100}%` }}><span className="absolute left-1 top-1 whitespace-nowrap">{mark.label}</span></div>)}
    </div>
  );
};
