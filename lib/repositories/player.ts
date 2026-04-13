import { db } from '../db';
import { Player } from '../../types';

const defaultPlayer: Player = {
  id: 'player',
  displayName: 'Founder',
  netWorth: 79700000000,
  prestigeScore: 200,
  createdAt: new Date().toISOString(),
  homeBaseICAO: 'PHNL',
  currentLocationICAO: 'PHNL',
  currentResortBookingID: null,
  settings: {
    simSpeed: 1,
    mapMode: 'dark',
    showFriendsOnMap: true,
  }
};

export const playerRepo = {
  get: async (): Promise<Player> => {
    const p = await db.player.get('player');
    if (!p) {
      await db.player.add(defaultPlayer);
      return defaultPlayer;
    }
    return p;
  },

  update: async (data: Partial<Player>) => {
    return await db.player.update('player', data);
  },

  adjustNetWorth: async (amountDelta: number) => {
    const p = await playerRepo.get();
    return await db.player.update('player', { netWorth: p.netWorth + amountDelta });
  }
};
