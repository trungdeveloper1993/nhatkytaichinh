import React, { useState, useEffect, useMemo } from 'react';
import { Fund, Transaction } from './types';
import { INITIAL_FUNDS, INITIAL_TRANSACTIONS } from './data';
import FundCard from './components/FundCard';
import FundForm from './components/FundForm';
import EditFundModal from './components/EditFundModal';
import TransactionForm from './components/TransactionForm';
import FinancialCharts from './components/FinancialCharts';
import TransactionHistory from './components/TransactionHistory';
import { formatCurrency } from './utils';
import { Wallet, Landmark, Landmark as BankIcon, CircleDollarSign, Plus, CheckCircle2, Layers, History, BarChart3, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOCAL_STORAGE_FUNDS_KEY = 'nhat_ky_tai_chinh_funds';
const LOCAL_STORAGE_TX_KEY = 'nhat_ky_tai_chinh_transactions';

export default function App() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'funds' | 'transactions' | 'reports'>('funds');
  const [editingFund, setEditingFund] = useState<Fund | null>(null);

  const currentMonthPrefix = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Load from LocalStorage or pre-populate on mount
  useEffect(() => {
    let storedFunds = localStorage.getItem(LOCAL_STORAGE_FUNDS_KEY);
    let storedTx = localStorage.getItem(LOCAL_STORAGE_TX_KEY);

    // If local storage has the old mock data (e.g., matching old fund names or IDs), force clear it to reset
    if (storedFunds && (storedFunds.includes('Quỹ Chi Tiêu Hàng Ngày') || storedFunds.includes('fund-2') || storedFunds.includes('Quỹ Học Tập & Phát Triển') || storedFunds.includes('Quỹ Du Lịch Mơ Ước'))) {
      localStorage.removeItem(LOCAL_STORAGE_FUNDS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_TX_KEY);
      storedFunds = null;
      storedTx = null;
    }

    if (storedFunds && storedTx) {
      setFunds(JSON.parse(storedFunds));
      setTransactions(JSON.parse(storedTx));
    } else {
      // First-time users get beautiful clean starter data
      localStorage.setItem(LOCAL_STORAGE_FUNDS_KEY, JSON.stringify(INITIAL_FUNDS));
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
      setFunds(INITIAL_FUNDS);
      setTransactions(INITIAL_TRANSACTIONS);
    }
    setIsLoaded(true);
  }, []);

  // Save changes to localStorage whenever state changes
  const saveState = (updatedFunds: Fund[], updatedTx: Transaction[]) => {
    localStorage.setItem(LOCAL_STORAGE_FUNDS_KEY, JSON.stringify(updatedFunds));
    localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(updatedTx));
  };

  // Add a new fund dynamically
  const handleAddFund = (fundData: Omit<Fund, 'id' | 'createdAt'>) => {
    const newFund: Fund = {
      ...fundData,
      id: `fund-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const nextFunds = [...funds, newFund];
    setFunds(nextFunds);
    saveState(nextFunds, transactions);
  };

  // Delete a fund and all associated transactions
  const handleDeleteFund = (fundId: string) => {
    const nextFunds = funds.filter((f) => f.id !== fundId);
    const nextTx = transactions.filter((t) => t.fundId !== fundId);
    setFunds(nextFunds);
    setTransactions(nextTx);
    saveState(nextFunds, nextTx);
  };

  // Edit an existing fund's details and save
  const handleEditFund = (updatedFund: Fund) => {
    const nextFunds = funds.map((f) => (f.id === updatedFund.id ? updatedFund : f));
    setFunds(nextFunds);
    saveState(nextFunds, transactions);
  };

  // Add a new transaction (updates associated fund balance)
  const handleAddTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    // Update the balance of the linked fund
    const nextFunds = funds.map((f) => {
      if (f.id === txData.fundId) {
        const balanceChange = txData.type === 'income' ? txData.amount : -txData.amount;
        return {
          ...f,
          balance: f.balance + balanceChange
        };
      }
      return f;
    });

    const nextTx = [newTx, ...transactions];

    setFunds(nextFunds);
    setTransactions(nextTx);
    saveState(nextFunds, nextTx);
  };

  // Delete/Undo a transaction (reverts the balance changes on the associated fund)
  const handleDeleteTransaction = (txId: string) => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) return;

    // Revert balance of the linked fund
    const nextFunds = funds.map((f) => {
      if (f.id === targetTx.fundId) {
        // If it was an expense, add it back. If it was income, deduct it.
        const balanceRevert = targetTx.type === 'expense' ? targetTx.amount : -targetTx.amount;
        return {
          ...f,
          balance: f.balance + balanceRevert
        };
      }
      return f;
    });

    const nextTx = transactions.filter((t) => t.id !== txId);

    setFunds(nextFunds);
    setTransactions(nextTx);
    saveState(nextFunds, nextTx);
  };

  // Clear all transaction logs without affecting or reverting the fund balances
  const handleClearTransactions = () => {
    setTransactions([]);
    saveState(funds, []);
  };

  // Financial summary metrics
  const financialSummary = useMemo(() => {
    let totalAssets = 0;
    let cashAssets = 0;
    let bankAssets = 0;

    funds.forEach((f) => {
      totalAssets += f.balance;
      if (f.type === 'cash') {
        cashAssets += f.balance;
      } else {
        bankAssets += f.balance;
      }
    });

    return { totalAssets, cashAssets, bankAssets };
  }, [funds]);

  if (!isLoaded) {
    return (
      <div id="loading-spinner" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold text-sm mt-4">Đang tải nhật ký tài chính của bạn...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen glass-bg text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* HEADER SECTION */}
      <header id="main-header" className="backdrop-blur-md bg-white/40 border-b border-white/20 py-6 px-4 md:px-8 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-600 text-white rounded-xl">
                <CircleDollarSign className="w-6 h-6" />
              </span>
              <h1 className="font-display font-black text-2xl tracking-tight text-slate-900">
                Nhật Ký Tài Chính
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
              Quản lý quỹ thông minh & Nhật ký chi tiêu
            </p>
          </div>

          {/* Quick Actions & Net Worth */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Net Worth Overview */}
            <div className="glass-pill p-3 rounded-2xl flex items-center gap-4">
              <div className="p-2.5 bg-indigo-100/60 rounded-xl text-indigo-700">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng số dư</p>
                <p className="font-display font-black text-xl text-slate-800 tracking-tight">
                  {formatCurrency(financialSummary.totalAssets)}
                </p>
              </div>
            </div>

            {/* Reset Button */}
            <button
              id="reset-all-data-btn"
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ quỹ và giao dịch để bắt đầu lại từ đầu không?')) {
                  localStorage.removeItem(LOCAL_STORAGE_FUNDS_KEY);
                  localStorage.removeItem(LOCAL_STORAGE_TX_KEY);
                  setFunds(INITIAL_FUNDS);
                  setTransactions(INITIAL_TRANSACTIONS);
                }
              }}
              className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200/55 hover:border-rose-300 text-rose-600 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-black shadow-2xs hover:shadow-xs shrink-0 cursor-pointer"
              title="Đặt lại và xóa toàn bộ dữ liệu"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Xóa dữ liệu</span>
            </button>
          </div>
        </div>
      </header>

      {/* BODY CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* TOTAL ASSETS SUB-DETAILS GRID */}
        <div id="summary-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="glass-card p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Tiền Mặt & Ví</p>
              <p className="font-display font-extrabold text-xl text-emerald-600 mt-1">
                {formatCurrency(financialSummary.cashAssets)}
              </p>
            </div>
            <span className="p-3 bg-emerald-100/50 text-emerald-700 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
          </div>

          <div className="glass-card p-5 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Tài Khoản Ngân Hàng</p>
              <p className="font-display font-extrabold text-xl text-indigo-600 mt-1">
                {formatCurrency(financialSummary.bankAssets)}
              </p>
            </div>
            <span className="p-3 bg-indigo-100/50 text-indigo-700 rounded-xl">
              <BankIcon className="w-5 h-5" />
            </span>
          </div>
        </div>

        {/* TABS SWITCHER */}
        <div className="flex bg-white/30 backdrop-blur-md border border-white/30 p-1.5 rounded-2xl mb-8 max-w-2xl mx-auto shadow-xs">
          <button
            onClick={() => setActiveTab('funds')}
            className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer relative"
          >
            {activeTab === 'funds' && (
              <motion.div
                layoutId="active-main-tab"
                className="absolute inset-0 bg-white/80 border border-white/50 rounded-xl shadow-xs"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Layers className={`w-4 h-4 z-10 ${activeTab === 'funds' ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span className={`z-10 text-xs sm:text-sm ${activeTab === 'funds' ? 'text-indigo-950 font-black' : 'text-slate-600 font-semibold'}`}>Quỹ & Tài Sản</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer relative"
          >
            {activeTab === 'transactions' && (
              <motion.div
                layoutId="active-main-tab"
                className="absolute inset-0 bg-white/80 border border-white/50 rounded-xl shadow-xs"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <History className={`w-4 h-4 z-10 ${activeTab === 'transactions' ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span className={`z-10 text-xs sm:text-sm ${activeTab === 'transactions' ? 'text-indigo-950 font-black' : 'text-slate-600 font-semibold'}`}>Sổ Giao Dịch</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer relative"
          >
            {activeTab === 'reports' && (
              <motion.div
                layoutId="active-main-tab"
                className="absolute inset-0 bg-white/80 border border-white/50 rounded-xl shadow-xs"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <BarChart3 className={`w-4 h-4 z-10 ${activeTab === 'reports' ? 'text-indigo-600' : 'text-slate-500'}`} />
            <span className={`z-10 text-xs sm:text-sm ${activeTab === 'reports' ? 'text-indigo-950 font-black' : 'text-slate-600 font-semibold'}`}>Báo Cáo Phân Tích</span>
          </button>
        </div>

        {/* TAB CONTENTS CONTAINER */}
        <div className="min-h-[450px]">
          <AnimatePresence mode="wait">
            {activeTab === 'funds' && (
              <motion.div
                key="funds-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <h2 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-600" />
                      Danh Sách Quỹ Tài Chính
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Cơ cấu và phân chia tiền mặt, tài khoản ngân hàng của bạn</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 bg-white/40 border border-white/50 rounded-lg text-slate-600 font-mono self-start sm:self-center">
                    Tổng cộng: {funds.length} Quỹ
                  </span>
                </div>

                {/* Funds Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {funds.map((fund) => {
                      const currentMonthSpent = transactions
                        .filter((t) => t.fundId === fund.id && t.type === 'expense' && t.date.startsWith(currentMonthPrefix))
                        .reduce((sum, t) => sum + t.amount, 0);
                      return (
                        <FundCard
                          key={fund.id}
                          fund={fund}
                          onDelete={handleDeleteFund}
                          onEdit={(f) => setEditingFund(f)}
                          canDelete={funds.length > 1}
                          currentMonthSpent={currentMonthSpent}
                        />
                      );
                    })}
                  </AnimatePresence>

                  <div className="h-full flex flex-col justify-stretch">
                    <FundForm onAddFund={handleAddFund} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'transactions' && (
              <motion.div
                key="transactions-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Left: Transaction entry form */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="mb-2">
                    <h2 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-indigo-600" />
                      Ghi Chép Mới
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Ghi nhận nhanh thu nhập hoặc chi phí phát sinh</p>
                  </div>
                  <TransactionForm
                    funds={funds}
                    onAddTransaction={handleAddTransaction}
                  />
                </div>

                {/* Right: History log with full width */}
                <div className="lg:col-span-7">
                  <TransactionHistory
                    transactions={transactions}
                    funds={funds}
                    onDeleteTransaction={handleDeleteTransaction}
                    onClearTransactions={handleClearTransactions}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div
                key="reports-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="mb-2">
                  <h2 className="font-display font-extrabold text-xl text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Báo Cáo & Phân Tích Dòng Tiền
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Trực quan hóa thu nhập, chi tiêu và cơ cấu dòng tiền</p>
                </div>
                
                <FinancialCharts
                  transactions={transactions}
                  funds={funds}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* FOOTER */}
      <footer id="main-footer" className="bg-white border-t border-slate-200 mt-16 py-8 px-4 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 Nhật Ký Tài Chính. Ghi chép tài chính cá nhân an toàn - Bảo mật dữ liệu trên trình duyệt của bạn.</p>
      </footer>

      {/* Edit Fund Modal */}
      {editingFund && (
        <EditFundModal
          fund={editingFund}
          onClose={() => setEditingFund(null)}
          onSave={handleEditFund}
        />
      )}

    </div>
  );
}
