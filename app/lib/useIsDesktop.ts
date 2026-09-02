'use client';

import { useEffect, useState } from 'react';

/** True at the md breakpoint and up. False during SSR and on phones. */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return desktop;
}
