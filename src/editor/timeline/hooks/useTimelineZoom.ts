import { useEffect, useState } from 'react';

export const useTimelineZoom = (minZoom = 0.25, maxZoom = 4): { zoom: number; zoomIn: () => void; zoomOut: () => void; setZoom: (value: number) => void; reset: () => void } => {
  const [zoom, setZoomState] = useState(1);

  const setZoom = (value: number) => setZoomState(Number(Math.max(minZoom, Math.min(maxZoom, value)).toFixed(2)));
  const zoomIn = () => setZoomState((value) => Math.min(maxZoom, Number((value + 0.25).toFixed(2))));
  const zoomOut = () => setZoomState((value) => Math.max(minZoom, Number((value - 0.25).toFixed(2))));
  const reset = () => setZoomState(1);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const target = event.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
      if (event.key === '=' || (event.shiftKey && (event.key === '-' || event.key === '_'))) {
        event.preventDefault();
        reset();
      } else if (event.key === '+') {
        event.preventDefault();
        zoomIn();
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomOut();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { zoom, zoomIn, zoomOut, setZoom, reset };
};
