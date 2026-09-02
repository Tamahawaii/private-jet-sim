'use client';

import { useEffect } from 'react';
import { settleCharter, settleMaintenance } from '../../lib/hangar';
import { resolveVoyages, settleUpkeep, settleYachtCharter } from '../../lib/estate';
import { persistClock } from '../lib/store';

/** Keeps the slow economy ticking while the app is open (charter, upkeep, voyages, maintenance). */
export default function WorldRunner() {
  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy) return; busy = true;
      try {
        await settleMaintenance();
        await settleCharter();
        await resolveVoyages();
        await settleYachtCharter();
        await settleUpkeep();
        persistClock();
      } catch (e) { console.warn('world tick', e); } finally { busy = false; }
    };
    const id = setInterval(tick, 12000);
    return () => clearInterval(id);
  }, []);
  return null;
}
