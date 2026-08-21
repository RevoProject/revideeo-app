import React, { useEffect } from 'react';

export interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('pointerdown', onClose);
    return () => {
      window.removeEventListener('keydown', handleKey, true);
      window.removeEventListener('pointerdown', onClose);
    };
  }, [onClose]);

  return (
    <div
      className="fixed z-[80] min-w-48 overflow-hidden rounded-lg border border-[#3a3d45] bg-[#202124] p-1 shadow-2xl"
      style={{ left: Math.min(x, window.innerWidth - 210), top: Math.min(y, window.innerHeight - items.length * 36 - 16) }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <button key={item.label} type="button" onClick={item.onClick} className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${item.danger ? 'text-red-400 hover:bg-red-600/15' : 'text-gray-300 hover:bg-[#2f3239]'}`}>
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
};
