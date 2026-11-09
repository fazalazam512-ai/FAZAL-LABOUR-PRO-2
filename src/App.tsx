import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { storageService } from './services/storageService';
import {
  calculateMonthlySummary,
  generateSmartInsights,
} from './services/financialCalculations';
import {
  ViewTab,
  Transaction,
  MonthlyBudget,
  Category,
  SavingsGoal,
  CreditDebitRecord,
  Loan,
  UserProfile,
  CurrencyCode,
} from './types';

// Subcomponents
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetView } from './components/BudgetView';
import { SavingsView } from './components/SavingsView';
import { CreditDebitView } from './components/CreditDebitView';
import { LoansView } from './components/LoansView';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { AdminPanel } from './components/AdminPanel';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { getFriendlySyncError, persistUserDataChanges, startUserDataSync } from './services/firestoreService';
import type { SyncStatus } from './services/firestoreService';
import type { TrackerData } from './services/firestoreDataModel';

interface MainTrackerAppProps {
  isDark: boolean;
  onToggleTheme: () => void;
  cloudReady: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  onSyncStatus: (status: SyncStatus, message?: string) => void;
  onCloudReady: () => void;
  persistData: (family: keyof TrackerData, previous: unknown, next: unknown) => void;
}

function MainTrackerApp({
  isDark,
  onToggleTheme,
  cloudReady,
  syncStatus,
  syncError,
  onSyncStatus,
  onCloudReady,
  persistData,
}: MainTrackerAppProps) {
  const { user, logout } = useAuth();

  // Central application state backed by local storage
  const [profile, setProfile] = useState<UserProfile>(() => storageService.getProfile());
  const [categories, setCategories] = useState<Category[]>(() => storageService.getCategories());
  const [transactions, setTransactions] = useState<Transaction[]>(() => storageService.getTransactions());
  const [budgets, setBudgets] = useState<Record<string, MonthlyBudget>>(() => storageService.getBudgets());
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => storageService.getSavingsGoals());
  const [creditDebitRecords, setCreditDebitRecords] = useState<CreditDebitRecord[]>(() => storageService.getCreditDebitRecords());
  const [loans, setLoans] = useState<Loan[]>(() => storageService.getLoans());
  const hasInitialSyncData = useRef(false);

  // Reload user-scoped data whenever authenticated user changes
  useEffect(() => {
    if (user) {
      setProfile(storageService.getProfile());
      setCategories(storageService.getCategories());
      setTransactions(storageService.getTransactions());
      setBudgets(storageService.getBudgets());
      setSavingsGoals(storageService.getSavingsGoals());
      setCreditDebitRecords(storageService.getCreditDebitRecords());
      setLoans(storageService.getLoans());
    }
  }, [user]);

  // Only start the cloud read/listeners after Firebase Auth has resolved this UID.
  useEffect(() => {
    if (!user) return;
    return startUserDataSync(user.uid, {
      onData: (data) => {
        setProfile(data.profile);
        setCategories(data.categories);
        setTransactions(data.transactions);
        if (!hasInitialSyncData.current) {
          hasInitialSyncData.current = true;
          if (data.transactions[0]?.date) setSelectedMonth(data.transactions[0].date.substring(0, 7));
        }
        setBudgets(data.budgets);
        setSavingsGoals(data.savingsGoals);
        setCreditDebitRecords(data.creditDebitRecords);
        setLoans(data.loans);
      },
      onStatus: onSyncStatus,
      onReady: onCloudReady,
    });
  }, [user?.uid, onSyncStatus, onCloudReady]);

  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');

  // Month navigation: default to newest transaction's month or current month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      const txs = storageService.getTransactions();
      if (Array.isArray(txs) && txs.length > 0 && txs[0] && txs[0].date) {
        return txs[0].date.substring(0, 7);
      }
    } catch {}
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal states
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const activeCurrency: CurrencyCode = profile?.currency || profile?.defaultCurrency || 'PKR';

  // Month switcher
  const handleMonthChange = (offset: number) => {
    try {
      const safeStr =
        selectedMonth && selectedMonth.includes('-')
          ? selectedMonth
          : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const [year, month] = safeStr.split('-').map(Number);
      const date = new Date(year, (month || 1) - 1 + offset, 1);
      const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(newMonthStr);
    } catch (e) {
      console.warn('Error changing month:', e);
    }
  };

  // Previous month string for MoM comparison
  const previousMonth = useMemo(() => {
    try {
      const safeStr =
        selectedMonth && selectedMonth.includes('-')
          ? selectedMonth
          : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const [year, month] = safeStr.split('-').map(Number);
      const date = new Date(year, (month || 1) - 2, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return '2026-08';
    }
  }, [selectedMonth]);

  // Current month's budget
  const currentBudget: MonthlyBudget = useMemo(() => {
    if (budgets && budgets[selectedMonth]) {
      return budgets[selectedMonth];
    }
    return {
      id: `budget_${selectedMonth || 'current'}`,
      month: selectedMonth,
      totalBudget: profile?.defaultMonthlyBudget || 0,
      categoryBudgets: {},
      warningThresholds: {
        warn75: true,
        warn90: true,
        warn100: true,
      },
    };
  }, [budgets, selectedMonth, profile?.defaultMonthlyBudget]);

  const previousBudget: MonthlyBudget = useMemo(() => {
    if (budgets && budgets[previousMonth]) {
      return budgets[previousMonth];
    }
    return {
      id: `budget_${previousMonth || 'previous'}`,
      month: previousMonth,
      totalBudget: profile?.defaultMonthlyBudget || 0,
      categoryBudgets: {},
      warningThresholds: {
        warn75: true,
        warn90: true,
        warn100: true,
      },
    };
  }, [budgets, previousMonth, profile?.defaultMonthlyBudget]);

  // Financial summaries
  const monthlySummary = useMemo(() => {
    return calculateMonthlySummary(
      transactions || [],
      currentBudget,
      categories || [],
      creditDebitRecords || [],
      loans || [],
      savingsGoals || [],
      selectedMonth
    );
  }, [transactions, currentBudget, categories, creditDebitRecords, loans, savingsGoals, selectedMonth]);

  const previousSummary = useMemo(() => {
    return calculateMonthlySummary(
      transactions || [],
      previousBudget,
      categories || [],
      creditDebitRecords || [],
      loans || [],
      savingsGoals || [],
      previousMonth
    );
  }, [transactions, previousBudget, categories, creditDebitRecords, loans, savingsGoals, previousMonth]);

  // Insights
  const insights = useMemo(() => {
    return generateSmartInsights(monthlySummary, previousSummary, savingsGoals || [], activeCurrency);
  }, [monthlySummary, previousSummary, savingsGoals, activeCurrency]);

  // Transaction handlers
  const handleSaveTransaction = (txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    let updatedList: Transaction[];
    const now = new Date().toISOString();
    if (editingTransaction) {
      const updatedTx: Transaction = {
        ...editingTransaction,
        ...txData,
        updatedAt: now,
      };
      updatedList = transactions.map((t) => (t.id === editingTransaction.id ? updatedTx : t));
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      updatedList = [newTx, ...transactions];
    }

    setTransactions(updatedList);
    storageService.saveTransactions(updatedList);
    persistData('transactions', transactions, updatedList);
    setIsAddTxModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const updatedList = transactions.filter((t) => t.id !== id);
    setTransactions(updatedList);
    storageService.saveTransactions(updatedList);
    persistData('transactions', transactions, updatedList);
  };

  // Budget handler
  const handleUpdateBudget = (updates: Partial<MonthlyBudget>) => {
    const updated: MonthlyBudget = {
      ...currentBudget,
      ...updates,
    };
    const newBudgets: Record<string, MonthlyBudget> = {
      ...budgets,
      [selectedMonth]: updated,
    };
    setBudgets(newBudgets);
    storageService.saveBudgets(newBudgets);
    persistData('budgets', budgets, newBudgets);
  };

  // Savings Goal handlers
  const handleAddSavingsGoal = (goalData: Omit<SavingsGoal, 'id' | 'history' | 'createdAt'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: `sg_${Date.now()}`,
      createdAt: new Date().toISOString(),
      history:
        goalData.currentAmount > 0
          ? [
              {
                id: `sgh_${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                amount: goalData.currentAmount,
                type: 'deposit',
                notes: 'Initial allocation',
              },
            ]
          : [],
    };
    const updated = [...savingsGoals, newGoal];
    setSavingsGoals(updated);
    storageService.saveSavingsGoals(updated);
    persistData('savingsGoals', savingsGoals, updated);
  };

  const handleRecordSavingsActivity = (
    goalId: string,
    amount: number,
    type: 'deposit' | 'withdraw',
    notes?: string
  ) => {
    const updated = savingsGoals.map((g) => {
      if (g.id !== goalId) return g;
      const newCurrent = type === 'deposit' ? g.currentAmount + amount : Math.max(0, g.currentAmount - amount);
      const newHistoryItem = {
        id: `sgh_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount,
        type,
        notes,
      };
      return {
        ...g,
        currentAmount: newCurrent,
        history: [newHistoryItem, ...(g.history || [])],
      };
    });
    setSavingsGoals(updated);
    storageService.saveSavingsGoals(updated);
    persistData('savingsGoals', savingsGoals, updated);
  };

  const handleDeleteSavingsGoal = (goalId: string) => {
    const updated = savingsGoals.filter((g) => g.id !== goalId);
    setSavingsGoals(updated);
    storageService.saveSavingsGoals(updated);
    persistData('savingsGoals', savingsGoals, updated);
  };

  // Credit / Debit handlers
  const handleAddCreditDebitRecord = (
    recData: Omit<CreditDebitRecord, 'id' | 'paidAmount' | 'remainingAmount' | 'status' | 'createdAt'>
  ) => {
    const newRec: CreditDebitRecord = {
      ...recData,
      id: `cd_${Date.now()}`,
      paidAmount: 0,
      remainingAmount: recData.amount,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [newRec, ...creditDebitRecords];
    setCreditDebitRecords(updated);
    storageService.saveCreditDebitRecords(updated);
    persistData('creditDebitRecords', creditDebitRecords, updated);
  };

  const handleRecordCreditDebitPayment = (id: string, paymentAmount: number) => {
    const updated = creditDebitRecords.map((r) => {
      if (r.id !== id) return r;
      const newPaid = Math.min(r.amount, r.paidAmount + paymentAmount);
      const newRemaining = Math.max(0, r.amount - newPaid);
      const newStatus: CreditDebitRecord['status'] =
        newRemaining === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'pending';
      return {
        ...r,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
      };
    });
    setCreditDebitRecords(updated);
    storageService.saveCreditDebitRecords(updated);
    persistData('creditDebitRecords', creditDebitRecords, updated);
  };

  const handleDeleteCreditDebitRecord = (id: string) => {
    const updated = creditDebitRecords.filter((r) => r.id !== id);
    setCreditDebitRecords(updated);
    storageService.saveCreditDebitRecords(updated);
    persistData('creditDebitRecords', creditDebitRecords, updated);
  };

  // Loan handlers
  const handleAddLoan = (
    loanData: Omit<Loan, 'id' | 'paidAmount' | 'remainingAmount' | 'status' | 'repayments'>
  ) => {
    const newLoan: Loan = {
      ...loanData,
      id: `loan_${Date.now()}`,
      paidAmount: 0,
      remainingAmount: loanData.principalAmount,
      status: 'active',
      repayments: [],
    };
    const updated = [newLoan, ...loans];
    setLoans(updated);
    storageService.saveLoans(updated);
    persistData('loans', loans, updated);
  };

  const handleRecordLoanRepayment = (loanId: string, amount: number, notes?: string) => {
    const updated = loans.map((l) => {
      if (l.id !== loanId) return l;
      const newPaid = Math.min(l.principalAmount, l.paidAmount + amount);
      const newRemaining = Math.max(0, l.principalAmount - newPaid);
      const newStatus = newRemaining === 0 ? ('paid' as const) : ('active' as const);
      const repaymentRecord = {
        id: `repay_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount,
        notes,
      };
      return {
        ...l,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
        repayments: [repaymentRecord, ...(l.repayments || [])],
      };
    });
    setLoans(updated);
    storageService.saveLoans(updated);
    persistData('loans', loans, updated);
  };

  const handleDeleteLoan = (loanId: string) => {
    const updated = loans.filter((l) => l.id !== loanId);
    setLoans(updated);
    storageService.saveLoans(updated);
    persistData('loans', loans, updated);
  };

  // Category and Settings handlers
  const handleAddCategory = (catData: Omit<Category, 'id' | 'isDefault'>) => {
    const newCat: Category = {
      ...catData,
      id: `custom_cat_${Date.now()}`,
      isDefault: false,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    storageService.saveCategories(updated);
    persistData('categories', categories, updated);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updated = categories.filter((c) => c.id !== categoryId);
    setCategories(updated);
    storageService.saveCategories(updated);
    persistData('categories', categories, updated);
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    storageService.saveProfile(updated);
    persistData('profile', profile, updated);
  };

  const handleExportAllData = () => {
    const jsonStr = storageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_expense_tracker_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportAllData = (jsonData: string): boolean => {
    const previous = storageService.getCurrentSnapshot();
    const success = storageService.importAllData(jsonData);
    if (success) {
      const imported = storageService.getCurrentSnapshot();
      setProfile(imported.profile);
      setCategories(imported.categories);
      setTransactions(imported.transactions);
      setBudgets(imported.budgets);
      setSavingsGoals(imported.savingsGoals);
      setCreditDebitRecords(imported.creditDebitRecords);
      setLoans(imported.loans);
      persistData('profile', previous.profile, imported.profile);
      persistData('categories', previous.categories, imported.categories);
      persistData('transactions', previous.transactions, imported.transactions);
      persistData('budgets', previous.budgets, imported.budgets);
      persistData('savingsGoals', previous.savingsGoals, imported.savingsGoals);
      persistData('creditDebitRecords', previous.creditDebitRecords, imported.creditDebitRecords);
      persistData('loans', previous.loans, imported.loans);
      return true;
    }
    return false;
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Reset all financial data to the empty state? This will delete your saved financial entries.'
      )
    ) {
      const previous = storageService.getCurrentSnapshot();
      storageService.resetToEmptyData();
      const resetData = storageService.getCurrentSnapshot();
      setProfile(resetData.profile);
      setCategories(resetData.categories);
      setTransactions(resetData.transactions);
      setBudgets(resetData.budgets);
      setSavingsGoals(resetData.savingsGoals);
      setCreditDebitRecords(resetData.creditDebitRecords);
      setLoans(resetData.loans);
      persistData('profile', previous.profile, resetData.profile);
      persistData('categories', previous.categories, resetData.categories);
      persistData('transactions', previous.transactions, resetData.transactions);
      persistData('budgets', previous.budgets, resetData.budgets);
      persistData('savingsGoals', previous.savingsGoals, resetData.savingsGoals);
      persistData('creditDebitRecords', previous.creditDebitRecords, resetData.creditDebitRecords);
      persistData('loans', previous.loans, resetData.loans);
    }
  };

  if (!cloudReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400">
        <Loader2 className="w-8 h-8 animate-spin" aria-label="Loading account data" />
        <span className="text-sm text-slate-600 dark:text-slate-300">Loading your account data…</span>
      </div>
    );
  }

  return (
    <div className={`app-shell min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-200 ${isDark ? 'theme-dark' : 'theme-light'}`}>
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingTransaction(null);
          setIsAddTxModalOpen(true);
        }}
        profile={profile}
        onToggleTheme={onToggleTheme}
        isDark={isDark}
        onSelectCurrency={(cur) => handleUpdateProfile({ defaultCurrency: cur, currency: cur })}
        userEmail={user?.email || profile.email}
        onLogout={logout}
      />

      <div className="app-workspace">
        <div role="status" aria-live="polite" className={`sync-strip sync-strip-${syncStatus}`}>
          <span className="sync-dot" aria-hidden="true" />
          <span>
            {syncStatus === 'saving' && 'Saving changes to your cloud account…'}
            {syncStatus === 'syncing' && 'Syncing your private account data…'}
            {syncStatus === 'loading' && 'Loading your account data…'}
            {syncStatus === 'saved' && 'Your cloud copy is up to date.'}
            {syncStatus === 'offline' && 'Offline — your browser-local copy is retained; cloud sync may be pending.'}
            {syncStatus === 'error' && (syncError || 'Cloud sync failed. Your browser-local copy is retained; the change is not confirmed in Firestore.')}
          </span>
        </div>

      <main id="main-content" className="app-main">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={monthlySummary}
            previousSummary={previousSummary}
            selectedMonth={selectedMonth}
            onChangeMonth={handleMonthChange}
            currency={activeCurrency}
            insights={insights}
            recentTransactions={transactions.slice(0, 8)}
            categories={categories}
            onOpenAddModal={() => {
              setEditingTransaction(null);
              setIsAddTxModalOpen(true);
            }}
            onSelectTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsAddTxModalOpen(true);
            }}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            categories={categories}
            currency={activeCurrency}
            onOpenAddModal={() => {
              setEditingTransaction(null);
              setIsAddTxModalOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsAddTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetView
            budget={currentBudget}
            summary={monthlySummary}
            categories={categories}
            currency={activeCurrency}
            selectedMonth={selectedMonth}
            onUpdateBudget={handleUpdateBudget}
          />
        )}

        {activeTab === 'savings' && (
          <SavingsView
            savingsGoals={savingsGoals}
            currency={activeCurrency}
            onAddGoal={handleAddSavingsGoal}
            onRecordActivity={handleRecordSavingsActivity}
            onDeleteGoal={handleDeleteSavingsGoal}
          />
        )}

        {activeTab === 'credit_debit' && (
          <CreditDebitView
            records={creditDebitRecords}
            currency={activeCurrency}
            onAddRecord={handleAddCreditDebitRecord}
            onRecordPayment={handleRecordCreditDebitPayment}
            onDeleteRecord={handleDeleteCreditDebitRecord}
          />
        )}

        {activeTab === 'loans' && (
          <LoansView
            loans={loans}
            currency={activeCurrency}
            onAddLoan={handleAddLoan}
            onRecordRepayment={handleRecordLoanRepayment}
            onDeleteLoan={handleDeleteLoan}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            transactions={transactions}
            categories={categories}
            currency={activeCurrency}
            selectedMonth={selectedMonth}
            onChangeMonth={handleMonthChange}
            onSelectTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsAddTxModalOpen(true);
            }}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            categories={categories}
            budget={currentBudget}
            creditDebitRecords={creditDebitRecords}
            loans={loans}
            currency={activeCurrency}
            selectedMonth={selectedMonth}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            profile={profile}
            categories={categories}
            isDark={isDark}
            onToggleTheme={onToggleTheme}
            onUpdateProfile={handleUpdateProfile}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onExportAllData={handleExportAllData}
            onImportAllData={handleImportAllData}
            onResetData={handleResetData}
            authEmail={user?.email || profile.email}
            userId={user?.uid}
            onLogout={logout}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            onBackToApp={() => setActiveTab('dashboard')}
            isDark={isDark}
          />
        )}
      </main>
        <footer className="app-footer">Your financial records remain private to your signed-in account.</footer>
      </div>

      {/* Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => {
          setIsAddTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        categories={categories}
        currency={activeCurrency}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const [isDark, setIsDark] = useState<boolean>(() => storageService.getTheme() === 'dark');
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [syncError, setSyncError] = useState<string | null>(null);
  const activeUid = useRef<string | undefined>(undefined);
  activeUid.current = user?.uid;

  const reportSyncStatus = useCallback((status: SyncStatus, message?: string) => {
    setSyncStatus(status);
    setSyncError(message || null);
  }, []);

  const reportCloudReady = useCallback(() => {
    setIsDark(storageService.getTheme() === 'dark');
    setCloudReady(true);
  }, []);

  const persistData = (family: keyof TrackerData, previous: unknown, next: unknown) => {
    if (!user) return;
    const uid = user.uid;
    setSyncError(null);
    setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saving');
    void persistUserDataChanges(uid, family, previous, next).then(() => {
      if (activeUid.current !== uid) return;
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saved');
      setSyncError(null);
    }).catch((error: unknown) => {
      if (activeUid.current !== uid) return;
      setSyncStatus('error');
      setSyncError(getFriendlySyncError(error));
    });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    if (user) {
      setCloudReady(false);
      setSyncStatus('syncing');
      setSyncError(null);
      setIsDark(storageService.getTheme() === 'dark');
    } else {
      setCloudReady(false);
      setSyncStatus('loading');
      setSyncError(null);
    }
  }, [user]);

  const toggleTheme = () => {
    const previous = storageService.getProfile();
    const next = !isDark;
    storageService.setTheme(next ? 'dark' : 'light');
    setIsDark(next);
    persistData('profile', previous, storageService.getProfile());
  };

  // Check if current URL is directly accessing the admin panel (via path or hash)
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path.endsWith('/admin') ||
      path.endsWith('/admin/') ||
      hash.includes('admin') ||
      search.includes('admin') ||
      search.includes('mode=admin')
    );
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      setIsAdminRoute(
        path.endsWith('/admin') ||
        path.endsWith('/admin/') ||
        hash.includes('admin') ||
        search.includes('admin') ||
        search.includes('mode=admin')
      );
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  return (
    <>
      {isAdminRoute ? (
        <AdminPanel
          isDark={isDark}
          onBackToApp={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', window.location.pathname.replace(/\/admin\/?$/i, '/') || '/');
              window.location.hash = '';
            }
            setIsAdminRoute(false);
          }}
        />
      ) : loading ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400">
          <Loader2 className="w-8 h-8 animate-spin" aria-label="Loading authentication" />
        </div>
      ) : user ? (
        <MainTrackerApp
          key={user.uid}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          cloudReady={cloudReady}
          syncStatus={syncStatus}
          syncError={syncError}
          onSyncStatus={reportSyncStatus}
          onCloudReady={reportCloudReady}
          persistData={persistData}
        />
      ) : (
        <AuthScreen isDark={isDark} onToggleTheme={toggleTheme} />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
