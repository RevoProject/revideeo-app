import { ArrowRightLeft } from 'lucide-react';

interface TransitionHandleProps {
  left: string;
  width: string;
  title: string;
  label?: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const TransitionHandle = ({ left, width, title, label, onPointerDown, onDoubleClick, onContextMenu }: TransitionHandleProps) => (
  <div
    onPointerDown={onPointerDown}
    onDoubleClick={onDoubleClick}
    onContextMenu={onContextMenu}
    style={{ left, width, touchAction: 'none' }}
    title={title}
    className="absolute top-0 bottom-0 z-20 flex items-center justify-center gap-0.5 cursor-ew-resize border-x border-fuchsia-400/70 bg-fuchsia-600/80"
  >
    <ArrowRightLeft size={10} className="shrink-0 text-white" />
    {label && (
      <span className="text-[8px] font-mono leading-none text-white/80 truncate pointer-events-none max-w-[60px]">
        {label}
      </span>
    )}
  </div>
);
