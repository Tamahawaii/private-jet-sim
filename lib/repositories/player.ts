import { db } from '../db';
import { Player } from '../../types';

export const playerRepo = {
  get: async (): Promise<Player | undefined> => {
    return await db.player.get('player');
  },

  update: async (data: Partial<Player>) => {
    return await db.player.update('player', data);
  },

  adjustNetWorth: async (amountDelta: number) => {
    const p = await playerRepo.get();
    if (!p) throw new Error("Player not initialized");
    return await db.player.update('player', { netWorth: p.netWorth + amountDelta });
  }
};
