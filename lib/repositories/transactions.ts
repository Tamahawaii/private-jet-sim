import { db } from '../db';
import { Transaction, TransactionType } from '../../types';

export const transactionRepo = {
  create: async (data: Omit<Transaction, 'id' | 'occurredAt'> & { occurredAt?: string }) => {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      occurredAt: data.occurredAt || new Date().toISOString(),
      ...data,
    };
    await db.transactions.add(transaction);
    return transaction;
  },

  getAll: async () => {
    return await db.transactions.orderBy('occurredAt').reverse().toArray();
  },

  lastOfType: async (type: TransactionType) => {
    const list = await db.transactions.where('type').equals(type).sortBy('occurredAt');
    return list.length > 0 ? list[list.length - 1] : null;
  }
};
