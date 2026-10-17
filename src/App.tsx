import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Fund, Transaction } from './types';
import { useFinanceStore } from './store';
import { exportToCsv, parseCsv } from './csv';
import { useToast } from './ToastContext';
import { useConfirm } from './DialogContext';
import { usePersistentState } from './hooks';
import { applyUpdate, onUpdateReady } from './pwa/register';
import { useAppLock } from './lock/AppLock';
import { STORAGE_KEYS, BACKUP_REMINDER_DAYS, APP_NAME } from './config';
import { sortFunds, TransactionInput } from './ledger';
import { formatCurrency } from './utils';
import { NAV_BY_KEY, TabKey, tabFromHash } from './nav';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import DashboardPage from './pages/DashboardPage';
import FundsPage from './pages/FundsPage';
import TransactionsPage from './pages/TransactionsPage';
import AllocationPlanner from './components/AllocationPlanner';
import QuickAddSheet from './components/QuickAddSheet';
import FundEditorSheet, { FundInput } from './components/FundEditorSheet';
import FundDetailSheet from './components/FundDetailSheet';
import ManagementModal from './components/ManagementModal';
import WhatsNewSheet, { useWhatsNew } from './components/WhatsNewSheet';
import { TxKind } from './components/TransactionForm';

// Trang Báo cáo (lịch + biểu đồ) và Cài đặt chỉ tải khi mở tab để app khởi động nhanh hơn
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const pageFallback = (
  <div className="flex items-center justify-center gap-2 py-24 text-sm font-semibold text-slate-500">
    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Đang tải...
  </div>
);

interface QuickAddState {
  open: boolean;
  key: number;
  type?: TxKind;
  fundId?: string;
  date?: string;
  editing?: Transaction | null;
}

export default function App() {
  const store = useFinanceStore();
  const { funds, transactions } = store;
  const { notify } = useToast();
  const confirm = useConfirm();

  const sortedFunds = useMemo(() => sortFunds(funds), [funds]);
  const totalAssets = useMemo(() => funds.reduce((s, f) => s + f.balance, 0), [funds]);

  // ---- Điều hướng theo hash (#/funds) để nút Back hoạt động ----
  const [tab, setTab] = useState<TabKey>(() => tabFromHash());
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    document.title = tab === 'dashboard' ? APP_NAME : `${NAV_BY_KEY[tab].label} · ${APP_NAME}`;
  }, [tab]);
  const navigate = useCallback((next: TabKey) => {
    if (tabFromHash() !== next) window.location.hash = `/${next}`;
    setTab(next);
    window.scrollTo({ top: 0 });
  }, []);

  // ---- Sao lưu ----
  const [lastBackup, setLastBackup] = usePersistentState<string | null>(STORAGE_KEYS.lastBackup, null);
  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null;
  const needsBackup = daysSinceBackup === null || daysSinceBackup >= BACKUP_REMINDER_DAYS;
  const backupLabel =
    daysSinceBackup === null
      ? 'Chưa sao lưu lần nào'
      : daysSinceBackup === 0
        ? 'Đã sao lưu hôm nay'
        : `Lần sao lưu gần nhất: ${daysSinceBackup} ngày trước`;

  useEffect(() => {
    if (store.saveError) {
      notify('Không lưu được dữ liệu vào trình duyệt (bộ nhớ đầy hoặc bị chặn). Hãy xuất file CSV để sao lưu ngay!', 'error', { duration: 8000 });
    }
  }, [store.saveError, notify]);

  // ---- Sheet: ghi chép nhanh / sửa giao dịch ----
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({ open: false, key: 0 });
  const openQuickAdd = useCallback((type?: TxKind, fundId?: string, date?: string) => {
    setQuickAdd((q) => ({ open: true, key: q.key + 1, type, fundId, date, editing: null }));
  }, []);
  const openEditTransaction = useCallback((tx: Transaction) => {
    setQuickAdd((q) => ({ open: true, key: q.key + 1, editing: tx }));
  }, []);
  const closeQuickAdd = useCallback(() => setQuickAdd((q) => ({ ...q, open: false })), []);

  // Mở từ phím tắt trên icon app (manifest shortcuts): ?quick=expense|income|transfer
  const [launchQuick] = useState<TxKind | null>(() => {
    const q = new URLSearchParams(window.location.search).get('quick');
    return q === 'expense' || q === 'income' || q === 'transfer' ? q : null;
  });
  useEffect(() => {
    if (!launchQuick) return;
    openQuickAdd(launchQuick);
    const url = new URL(window.location.href);
    url.searchParams.delete('quick');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [launchQuick, openQuickAdd]);

  // ---- Phiên bản mới: bảng "Có gì mới" + thông báo cập nhật ----
  const whatsNew = useWhatsNew(launchQuick !== null);
  useEffect(
    () =>
      onUpdateReady(() =>
        notify('Đã có phiên bản mới của ứng dụng 🎉', 'info', {
          action: { label: 'Cập nhật', onClick: applyUpdate },
          duration: 0,
        }),
      ),
    [notify],
  );

  // ---- Sheet: quỹ ----
  const [fundEditor, setFundEditor] = useState<{ open: boolean; key: number; fundId?: string }>({ open: false, key: 0 });
  const [detailFundId, setDetailFundId] = useState<string | null>(null);
  const [managementFundId, setManagementFundId] = useState<string | null>(null);
  const editorFund = fundEditor.fundId ? funds.find((f) => f.id === fundEditor.fundId) || null : null;
  const detailFund = detailFundId ? funds.find((f) => f.id === detailFundId) || null : null;
  const managementFund = managementFundId ? funds.find((f) => f.id === managementFundId) || null : null;

  const fundName = (id?: string) => funds.find((f) => f.id === id)?.name || 'quỹ';

  // ---- Giao dịch ----
  const describeTransaction = (tx: TransactionInput) =>
    tx.type === 'transfer'
      ? `Đã chuyển ${formatCurrency(tx.amount)} từ ${fundName(tx.fundId)} ➡️ ${fundName(tx.toFundId)}`
      : tx.type === 'income'
        ? `Đã bổ sung ${formatCurrency(tx.amount)} vào ${fundName(tx.fundId)}`
        : `Đã ghi nhận chi tiêu ${formatCurrency(tx.amount)} từ ${fundName(tx.fundId)}`;

  const handleAddTransaction = (tx: TransactionInput) => {
    store.addTransaction(tx);
    notify(describeTransaction(tx), 'success');
  };

  const handleQuickAddSubmit = (tx: TransactionInput) => {
    if (quickAdd.editing) {
      store.updateTransaction(quickAdd.editing.id, tx);
      notify('Đã cập nhật giao dịch và tính lại số dư các quỹ', 'success');
    } else {
      handleAddTransaction(tx);
    }
    closeQuickAdd();
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = store.deleteTransaction(id);
    if (!tx) return;
    notify(`Đã xóa "${tx.category}" (${formatCurrency(tx.amount)}) và hoàn lại số dư`, 'info', {
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          store.restoreTransaction(tx);
          notify('Đã khôi phục giao dịch', 'success');
        },
      },
    });
  };

  const handleClearTransactions = () => {
    const count = transactions.length;
    store.clearTransactions();
    notify(`Đã dọn dẹp ${count} dòng nhật ký giao dịch`, 'info');
  };

  // ---- Quỹ ----
  const openCreateFund = () => setFundEditor((s) => ({ open: true, key: s.key + 1, fundId: undefined }));
  const openEditFund = (fund: Fund) => setFundEditor((s) => ({ open: true, key: s.key + 1, fundId: fund.id }));

  const handleSaveFund = (data: FundInput, original?: Fund) => {
    if (original) {
      store.updateFund({ ...original, ...data });
      notify(`Đã lưu thay đổi cho ${data.name}`, 'success');
    } else {
      store.addFund(data);
      notify(`Đã tạo ${data.name}`, 'success');
    }
    setFundEditor((s) => ({ ...s, open: false }));
  };

  const handleTogglePin = (fund: Fund) => {
    store.updateFund({ ...fund, pinned: !fund.pinned });
    notify(fund.pinned ? `Đã bỏ ghim ${fund.name}` : `Đã ghim ${fund.name} lên đầu`, 'info');
  };

  const handleDeleteFund = (fundId: string) => {
    const fund = funds.find((f) => f.id === fundId);
    store.deleteFund(fundId);
    if (detailFundId === fundId) setDetailFundId(null);
    notify(`Đã xóa ${fund?.name || 'quỹ'} cùng các giao dịch liên quan`, 'info');
  };

  const confirmDeleteFund = async (fund: Fund) => {
    const ok = await confirm({
      title: `Xóa ${fund.name}?`,
      tone: 'danger',
      confirmText: 'Xóa quỹ',
      message: (
        <>
          Quỹ và <strong>toàn bộ giao dịch liên quan</strong> sẽ bị xóa vĩnh viễn. Hãy sao lưu file CSV trước nếu chưa chắc chắn.
        </>
      ),
    });
    if (ok) handleDeleteFund(fund.id);
  };

  // ---- Xuất / nhập CSV ----
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCsv = async () => {
    const csvContent = '﻿' + exportToCsv(funds, transactions); // BOM để Excel đọc đúng tiếng Việt
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const filename = `nhat-ky-tai-chinh-${stamp}.csv`;
    const markBackedUp = () => {
      setLastBackup(new Date().toISOString());
      notify('Đã xuất file sao lưu CSV', 'success');
    };

    // iOS/Safari: dùng Web Share API ("Lưu vào Tệp", AirDrop...) vì <a download> không lưu được về thư mục
    try {
      const file = new File([csvContent], filename, { type: 'text/csv' });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data?: ShareData) => Promise<void>;
      };
      if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename });
        markBackedUp();
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return; // người dùng bấm Hủy
    }

    // Desktop / Android: tải xuống trực tiếp
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    markBackedUp();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng file lần sau
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = parseCsv(String(event.target?.result || ''));
        const ok = await confirm({
          title: 'Khôi phục từ file CSV?',
          tone: 'danger',
          confirmText: 'Thay thế dữ liệu',
          message: (
            <>
              Tải lên <strong>{parsed.funds.length} quỹ</strong> và <strong>{parsed.transactions.length} giao dịch</strong> từ “{file.name}”.
              Dữ liệu hiện tại sẽ được <strong>thay thế hoàn toàn</strong>.
            </>
          ),
        });
        if (!ok) return;
        store.replaceAll(parsed.funds, parsed.transactions);
        setDetailFundId(null);
        notify(`Đã khôi phục ${parsed.funds.length} quỹ và ${parsed.transactions.length} giao dịch`, 'success');
      } catch (err) {
        notify(`Không thể đọc file CSV: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  const openImport = () => fileInputRef.current?.click();

  // ---- Phím tắt: N = ghi chép nhanh, L = khóa ứng dụng ----
  const { enabled: lockEnabled, lockNow } = useAppLock();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((key !== 'n' && key !== 'l') || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (key === 'l') {
        if (!lockEnabled) return;
        e.preventDefault();
        lockNow();
        return;
      }
      e.preventDefault();
      openQuickAdd();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openQuickAdd, lockEnabled, lockNow]);

  // ---- Nội dung trang ----
  const renderPage = () => {
    switch (tab) {
      case 'dashboard':
        return (
          <DashboardPage
            funds={sortedFunds}
            transactions={transactions}
            needsBackup={needsBackup}
            backupLabel={backupLabel}
            onNavigate={navigate}
            onQuickAdd={openQuickAdd}
            onOpenFund={(f) => setDetailFundId(f.id)}
            onEditTransaction={openEditTransaction}
            onBackup={handleExportCsv}
          />
        );
      case 'funds':
        return (
          <FundsPage
            funds={sortedFunds}
            transactions={transactions}
            onCreateFund={openCreateFund}
            onOpenFund={(f) => setDetailFundId(f.id)}
            onEditFund={openEditFund}
            onDeleteFund={handleDeleteFund}
            onTogglePin={handleTogglePin}
            onOpenManagement={(f) => setManagementFundId(f.id)}
          />
        );
      case 'transactions':
        return (
          <TransactionsPage
            funds={sortedFunds}
            transactions={transactions}
            onAdd={handleAddTransaction}
            onEdit={openEditTransaction}
            onDelete={handleDeleteTransaction}
            onClear={handleClearTransactions}
            onQuickAdd={() => openQuickAdd()}
          />
        );
      case 'allocation':
        return <AllocationPlanner funds={sortedFunds} transactions={transactions} onUpdateFund={store.updateFund} />;
      case 'reports':
        return (
          <Suspense fallback={pageFallback}>
            <ReportsPage
              funds={sortedFunds}
              transactions={transactions}
              onEditTransaction={openEditTransaction}
              onAddForDate={(date) => openQuickAdd(undefined, undefined, date)}
            />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={pageFallback}>
            <SettingsPage
              funds={funds}
              transactions={transactions}
              backupLabel={backupLabel}
              needsBackup={needsBackup}
              onExport={handleExportCsv}
              onImport={openImport}
              onShowWhatsNew={whatsNew.show}
            />
          </Suspense>
        );
    }
  };

  return (
    <div className="min-h-screen glass-bg text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar active={tab} onNavigate={navigate} backupLabel={backupLabel} needsBackup={needsBackup} onBackup={handleExportCsv} />

      <div className="lg:pl-64 min-h-screen flex flex-col">
        <TopBar
          tab={tab}
          totalAssets={totalAssets}
          onExport={handleExportCsv}
          onImport={openImport}
          onQuickAdd={() => openQuickAdd()}
          onOpenSettings={() => navigate('settings')}
        />

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 lg:px-8 pt-5 sm:pt-6 pb-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer
          id="main-footer"
          className="px-4 pt-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8 text-center text-xs text-slate-400 font-medium"
        >
          <p className="max-w-2xl mx-auto leading-relaxed">
            Lưu ý nhỏ nè ❤️ Nhật ký được lưu ngay trên trình duyệt của bạn. Vì vậy đừng xóa dữ liệu duyệt web (lịch sử / cache) và lưu ý khi đổi máy hoặc đổi trình duyệt — nếu không bạn có thể bị mất toàn bộ nhật ký đã ghi. Hãy giữ gìn cẩn thận nha!
          </p>
        </footer>
      </div>

      <BottomNav active={tab} onNavigate={navigate} />

      {/* Nút ghi chép nhanh (mobile) */}
      {tab !== 'settings' && (
        <motion.button
          id="fab-quick-add"
          onClick={() => openQuickAdd()}
          whileTap={{ scale: 0.9 }}
          className="lg:hidden fixed z-40 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-300/70 flex items-center justify-center cursor-pointer"
          aria-label="Ghi chép nhanh"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </motion.button>
      )}

      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />

      <FundDetailSheet
        fund={detailFund}
        onClose={() => setDetailFundId(null)}
        funds={sortedFunds}
        transactions={transactions}
        canDelete={funds.length > 1}
        onQuickAdd={(type, fundId) => openQuickAdd(type, fundId)}
        onEdit={openEditFund}
        onTogglePin={handleTogglePin}
        onOpenManagement={(f) => setManagementFundId(f.id)}
        onEditTransaction={openEditTransaction}
        onDelete={confirmDeleteFund}
      />

      <FundEditorSheet
        open={fundEditor.open}
        sessionKey={fundEditor.key}
        fund={editorFund}
        onClose={() => setFundEditor((s) => ({ ...s, open: false }))}
        onSave={handleSaveFund}
      />

      <ManagementModal
        fund={managementFund}
        onClose={() => setManagementFundId(null)}
        onSave={(f) => {
          store.updateFund(f);
          notify('Đã lưu cách quản lý', 'success');
        }}
      />

      <QuickAddSheet
        open={quickAdd.open}
        sessionKey={quickAdd.key}
        onClose={closeQuickAdd}
        funds={sortedFunds}
        initialType={quickAdd.type}
        initialFundId={quickAdd.fundId}
        initialDate={quickAdd.date}
        editing={quickAdd.editing}
        onSubmit={handleQuickAddSubmit}
        onDelete={(tx) => {
          closeQuickAdd();
          handleDeleteTransaction(tx.id);
        }}
      />

      <WhatsNewSheet open={whatsNew.open} onClose={whatsNew.close} />
    </div>
  );
}
