import { useEffect, useState } from 'react';

const detectMobileDevice = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

export const useMobileDevice = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(detectMobileDevice());
    update();
    mediaQuery.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    return () => {
      mediaQuery.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return isMobile;
};
