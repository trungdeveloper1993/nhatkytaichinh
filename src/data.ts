import { Fund, Transaction } from './types';

export const INITIAL_FUNDS: Fund[] = [
  {
    id: 'fund-1',
    name: 'Quỹ Tiền Mặt',
    type: 'cash',
    balance: 0,
    color: 'emerald',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
