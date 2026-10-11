import { useCallback, useEffect, useRef, useState } from 'react';
import { Fund, Transaction } from './types';
import { INITIAL_FUNDS, INITIAL_TRANSACTIONS } from './data';
import { STORAGE_KEYS } from './config';
import { applyTransaction, revertTransaction, TransactionInput } from './ledger';

export interface FinanceData {
  funds: Fund[];
  transactions: Transaction[];
}

// Bộ dữ liệu mẫu rất cũ (bản đầu tiên) cần dọn khi gặp lại.
// Chỉ coi là dữ liệu mẫu cũ khi có ĐÚNG id "fund-2" của bộ mẫu VÀ tên quỹ mẫu,
// tránh xóa nhầm dữ liệu thật (id dạng fund-<timestamp>, tên quỹ trùng ngẫu nhiên).
const LEGACY_MOCK_NAMES = ['Quỹ Chi Tiêu Hàng Ngày', 'Quỹ Học Tập & Phát Triển', 'Quỹ Du Lịch Mơ Ước'];

function isLegacyMock(rawFunds: string): boolean {
  return rawFunds.includes('"id":"fund-2"') && LEGACY_MOCK_NAMES.some((n) => rawFunds.includes(n));
}

function loadData(): FinanceData {
  try {
    const rawFunds = localStorage.getItem(STORAGE_KEYS.funds);
    const rawTx = localStorage.getItem(STORAGE_KEYS.transactions);
    if (rawFunds && rawTx && !isLegacyMock(rawFunds)) {
      return { funds: JSON.parse(rawFunds), transactions: JSON.parse(rawTx) };
    }
  } catch {
    // Dữ liệu hỏng hoặc không đọc được -> dùng bộ mẫu
  }
  return { funds: INITIAL_FUNDS, transactions: INITIAL_TRANSACTIONS };
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useFinanceStore() {
  const [data, setData] = useState<FinanceData>(loadData);
  const [saveError, setSaveError] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Lưu xuống trình duyệt mỗi khi dữ liệu thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.funds, JSON.stringify(data.funds));
      localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(data.transactions));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [data]);

  const addFund = useCallback((input: Omit<Fund, 'id' | 'createdAt'>) => {
    const fund: Fund = { ...input, id: newId('fund'), createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, funds: [...d.funds, fund] }));
    return fund;
  }, []);

  const updateFund = useCallback((fund: Fund) => {
    setData((d) => ({ ...d, funds: d.funds.map((f) => (f.id === fund.id ? fund : f)) }));
  }, []);

  // Xóa quỹ kèm mọi giao dịch liên quan (kể cả chuyển quỹ đến quỹ này)
  const deleteFund = useCallback((fundId: string) => {
    setData((d) => ({
      funds: d.funds.filter((f) => f.id !== fundId),
      transactions: d.transactions.filter((t) => t.fundId !== fundId && t.toFundId !== fundId),
    }));
  }, []);

  const addTransaction = useCallback((input: TransactionInput) => {
    const tx: Transaction = { ...input, id: newId('tx'), createdAt: new Date().toISOString() };
    setData((d) => ({ funds: applyTransaction(d.funds, tx), transactions: [tx, ...d.transactions] }));
    return tx;
  }, []);

  // Sửa giao dịch: hoàn tác ảnh hưởng cũ rồi áp dụng giao dịch mới
  const updateTransaction = useCallback((id: string, input: TransactionInput) => {
    setData((d) => {
      const old = d.transactions.find((t) => t.id === id);
      if (!old) return d;
      const next: Transaction = { ...input, id: old.id, createdAt: old.createdAt };
      if (next.type !== 'transfer') delete next.toFundId;
      return {
        funds: applyTransaction(revertTransaction(d.funds, old), next),
        transactions: d.transactions.map((t) => (t.id === id ? next : t)),
      };
    });
  }, []);

  // Xóa giao dịch và hoàn lại số dư; trả về giao dịch đã xóa để có thể hoàn tác
  const deleteTransaction = useCallback((id: string) => {
    const tx = dataRef.current.transactions.find((t) => t.id === id);
    if (!tx) return null;
    setData((d) =>
      d.transactions.some((t) => t.id === id)
        ? { funds: revertTransaction(d.funds, tx), transactions: d.transactions.filter((t) => t.id !== id) }
        : d
    );
    return tx;
  }, []);

  // Khôi phục giao dịch vừa xóa (Hoàn tác)
  const restoreTransaction = useCallback((tx: Transaction) => {
    setData((d) =>
      d.transactions.some((t) => t.id === tx.id)
        ? d
        : { funds: applyTransaction(d.funds, tx), transactions: [tx, ...d.transactions] }
    );
  }, []);

  // Dọn lịch sử giao dịch, giữ nguyên số dư các quỹ
  const clearTransactions = useCallback(() => {
    setData((d) => ({ ...d, transactions: [] }));
  }, []);

  const replaceAll = useCallback((funds: Fund[], transactions: Transaction[]) => {
    setData({ funds, transactions });
  }, []);

  return {
    funds: data.funds,
    transactions: data.transactions,
    saveError,
    addFund,
    updateFund,
    deleteFund,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    clearTransactions,
    replaceAll,
  };
}

export type FinanceStore = ReturnType<typeof useFinanceStore>;
