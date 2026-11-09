import {
  Transaction,
  Category,
  MonthlyBudget,
  SavingsGoal,
  CreditDebitRecord,
  Loan,
  UserProfile,
} from '../types';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';
import {
  INITIAL_USER_PROFILE,
  INITIAL_BUDGETS,
  INITIAL_SAVINGS_GOALS,
  INITIAL_CREDIT_DEBIT,
  INITIAL_LOANS,
  INITIAL_TRANSACTIONS,
} from './seedData';
import type { PartialTrackerData, TrackerData, TrackerDataSources } from './firestoreDataModel';

const BASE_KEYS = {
  PROFILE: 'set_profile_v1',
  TRANSACTIONS: 'set_transactions_v1',
  CATEGORIES: 'set_categories_v1',
  BUDGETS: 'set_budgets_v1',
  SAVINGS: 'set_savings_v1',
  CREDIT_DEBIT: 'set_credit_debit_v1',
  LOANS: 'set_loans_v1',
};

const LEGACY_OWNER_KEY = 'smart_expense_legacy_owner_uid_v1';

class StorageService {
  private currentUserId: string | null = null;
  private memoryCache: Record<string, string> = {};

  private safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item !== null && item !== 'null' && item !== 'undefined') {
          return item;
        }
      }
    } catch (e) {
      console.warn('localStorage getItem failed, checking memory cache:', e);
    }
    return this.memoryCache[key] ?? null;
  }

  private safeSetItem(key: string, value: string): void {
    this.memoryCache[key] = value;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage setItem failed, persisted to memory cache only:', e);
    }
  }

  /**
   * Set active authenticated user and ensure baseline data exists
   */
  initForUser(userId: string | null, email?: string | null, displayName?: string | null): void {
    try {
      this.currentUserId = userId;
      if (userId) {
        const existingProfile = this.safeGetItem(this.getKey(BASE_KEYS.PROFILE));
        if (!existingProfile) {
          // Initialize user with their name and email
          const initialProfile: UserProfile = {
            ...INITIAL_USER_PROFILE,
            name: displayName || (email ? email.split('@')[0] : 'Expense Manager'),
            email: email || '',
            defaultCurrency: 'PKR',
            currency: 'PKR',
          };
          this.saveProfile(initialProfile);
        }
      }
    } catch (e) {
      console.error('Error during initForUser in StorageService:', e);
    }
  }

  private getKey(baseKey: string): string {
    return this.currentUserId ? `${baseKey}_${this.currentUserId}` : baseKey;
  }

  getActiveUserId(): string | null {
    return this.currentUserId;
  }

  // --- Profile ---
  getProfile(): UserProfile {
    try {
      const data = this.safeGetItem(this.getKey(BASE_KEYS.PROFILE));
      if (!data) return { ...INITIAL_USER_PROFILE };
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return {
          ...INITIAL_USER_PROFILE,
          ...parsed,
          defaultCurrency: parsed.defaultCurrency || parsed.currency || INITIAL_USER_PROFILE.defaultCurrency || 'PKR',
          currency: parsed.currency || parsed.defaultCurrency || INITIAL_USER_PROFILE.defaultCurrency || 'PKR',
          name: parsed.name || INITIAL_USER_PROFILE.name || 'Expense Manager',
        };
      }
      return { ...INITIAL_USER_PROFILE };
    } catch {
      return { ...INITIAL_USER_PROFILE };
    }
  }

  saveProfile(profile: UserProfile): void {
    try {
      const safeProfile: UserProfile = {
        ...INITIAL_USER_PROFILE,
        ...profile,
        defaultCurrency: profile.defaultCurrency || profile.currency || 'PKR',
        currency: profile.currency || profile.defaultCurrency || 'PKR',
      };
      this.safeSetItem(this.getKey(BASE_KEYS.PROFILE), JSON.stringify(safeProfile));
    } catch (e) {
      console.warn('Failed to save profile:', e);
    }
  }

  // --- Transactions ---
  getTransactions(): Transaction[] {
    try {
      const data = this.safeGetItem(this.getKey(BASE_KEYS.TRANSACTIONS));
      if (!data) return [...INITIAL_TRANSACTIONS];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [...INITIAL_TRANSACTIONS];
    } catch {
      return [...INITIAL_TRANSACTIONS];
    }
  }

  saveTransactions(transactions: Transaction[]): void {
    try {
      const safeList = Array.isArray(transactions) ? transactions : [];
      this.safeSetItem(this.getKey(BASE_KEYS.TRANSACTIONS), JSON.stringify(safeList));
    } catch (e) {
      console.warn('Failed to save transactions:', e);
    }
  }

  addTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
    const list = this.getTransactions();
    const now = new Date().toISOString();
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newTx, ...list];
    this.saveTransactions(updated);
    return newTx;
  }

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const list = this.getTransactions();
    const index = list.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updatedTx: Transaction = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updatedTx;
    this.saveTransactions(list);
    return updatedTx;
  }

  deleteTransaction(id: string): boolean {
    const list = this.getTransactions();
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length !== list.length) {
      this.saveTransactions(filtered);
      return true;
    }
    return false;
  }

  // --- Categories ---
  getCategories(): Category[] {
    try {
      const data = this.safeGetItem(this.getKey(BASE_KEYS.CATEGORIES));
      if (!data) return [...DEFAULT_CATEGORIES];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_CATEGORIES];
    } catch {
      return [...DEFAULT_CATEGORIES];
    }
  }

  saveCategories(categories: Category[]): void {
    try {
      const safeList = Array.isArray(categories) && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
      this.safeSetItem(this.getKey(BASE_KEYS.CATEGORIES), JSON.stringify(safeList));
    } catch (e) {
      console.warn('Failed to save categories:', e);
    }
  }

  addCategory(category: Omit<Category, 'id' | 'isDefault'>): Category {
    const list = this.getCategories();
    const newCat: Category = {
      ...category,
      id: `cat_custom_${Date.now()}`,
      isDefault: false,
    };
    const updated = [...list, newCat];
    this.saveCategories(updated);
    return newCat;
  }

  deleteCategory(categoryId: string, reassignToCategoryId?: string): boolean {
    const list = this.getCategories();
    const cat = list.find((c) => c.id === categoryId);
    if (!cat || cat.isDefault) return false;

    // If transactions use this category, reassign them
    if (reassignToCategoryId) {
      const transactions = this.getTransactions();
      const updatedTx = transactions.map((t) =>
        t.categoryId === categoryId ? { ...t, categoryId: reassignToCategoryId } : t
      );
      this.saveTransactions(updatedTx);
    }

    const filtered = list.filter((c) => c.id !== categoryId);
    this.saveCategories(filtered);
    return true;
  }

  // --- Budgets ---
  getBudgets(): Record<string, MonthlyBudget> {
    try {
      const data = this.safeGetItem(this.getKey(BASE_KEYS.BUDGETS));
      if (!data) return { ...INITIAL_BUDGETS };
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : { ...INITIAL_BUDGETS };
    } catch {
      return { ...INITIAL_BUDGETS };
    }
  }

  saveBudgets(budgets: Record<string, MonthlyBudget>): void {
    try {
      const safeBudgets = budgets && typeof budgets === 'object' ? budgets : INITIAL_BUDGETS;
      this.safeSetItem(this.getKey(BASE_KEYS.BUDGETS), JSON.stringify(safeBudgets));
    } catch (e) {
      console.warn('Failed to save budgets:', e);
    }
  }

  getBudgetForMonth(monthStr: string, defaultAmount: number = 0): MonthlyBudget {
    const budgets = this.getBudgets();
    if (budgets[monthStr]) {
      return budgets[monthStr];
    }
    // Auto-create initial default budget for month if not existing
    const newBudget: MonthlyBudget = {
      id: `budget_${monthStr.replace('-', '_')}`,
      month: monthStr,
      totalBudget: defaultAmount,
      categoryBudgets: {},
      warningThresholds: { warn75: true, warn90: true, warn100: true },
    };
    budgets[monthStr] = newBudget;
    this.saveBudgets(budgets);
    return newBudget;
  }

  updateBudgetForMonth(monthStr: string, updates: Partial<MonthlyBudget>): MonthlyBudget {
    const budgets = this.getBudgets();
    const current = budgets[monthStr] || {
      id: `budget_${monthStr.replace('-', '_')}`,
      month: monthStr,
      totalBudget: 0,
      categoryBudgets: {},
      warningThresholds: { warn75: true, warn90: true, warn100: true },
    };
    const updated: MonthlyBudget = {
      ...current,
      ...updates,
    };
    budgets[monthStr] = updated;
    this.saveBudgets(budgets);
    return updated;
  }

  // --- Savings Goals ---
  getSavingsGoals(): SavingsGoal[] {
    try {
      const data = this.safeGetItem(this.getKey(BASE_KEYS.SAVINGS));
      if (!data) return [...INITIAL_SAVINGS_GOALS];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [...INITIAL_SAVINGS_GOALS];
    } catch {
      return [...INITIAL_SAVINGS_GOALS];
    }
  }

  saveSavingsGoals(goals: SavingsGoal[]): void {
    try {
      const safeList = Array.isArray(goals) ? goals : [];
      this.safeSetItem(this.getKey(BASE_KEYS.SAVINGS), JSON.stringify(safeList));
    } catch (e) {
      console.warn('Failed to save savings goals:', e);
    }
  }

  addSavingsGoal(goal: Omit<SavingsGoal, 'id' | 'history' | 'createdAt'>): SavingsGoal {
    const list = this.getSavingsGoals();
    const newGoal: SavingsGoal = {
      ...goal,
      id: `goal_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      history: [
        {
          id: `sh_${Date.now()}`,
          amount: goal.currentAmount,
          type: 'deposit',
          date: new Date().toISOString().split('T')[0],
          notes: 'Initial balance',
        },
      ],
    };
    const updated = [...list, newGoal];
    this.saveSavingsGoals(updated);
    return newGoal;
  }

  recordSavingsActivity(
    goalId: string,
    amount: number,
    type: 'deposit' | 'withdraw',
    notes?: string
  ): SavingsGoal | null {
    const list = this.getSavingsGoals();
    const goal = list.find((g) => g.id === goalId);
    if (!goal) return null;

    const newCurrent =
      type === 'deposit'
        ? goal.currentAmount + amount
        : Math.max(0, goal.currentAmount - amount);

    const updatedGoal: SavingsGoal = {
      ...goal,
      currentAmount: newCurrent,
      history: [
        {
          id: `sh_${Date.now()}`,
          amount,
          type,
          date: new Date().toISOString().split('T')[0],
          notes,
        },
        ...goal.history,
      ],
    };

    const updatedList = list.map((g) => (g.id === goalId ? updatedGoal : g));
    this.saveSavingsGoals(updatedList);
    return updatedGoal;
  }

  deleteSavingsGoal(goalId: string): boolean {
    const list = this.getSavingsGoals();
    const filtered = list.filter((g) => g.id !== goalId);
    if (filtered.length !== list.length) {
      this.saveSavingsGoals(filtered);
      return true;
    }
    return false;
  }

  // --- Credit & Debit ---
  getCreditDebitRecords(): CreditDebitRecord[] {
    try {
      const data = this.safeGetItem(this.getKey(BASE_KEYS.CREDIT_DEBIT));
      if (!data) return [...INITIAL_CREDIT_DEBIT];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [...INITIAL_CREDIT_DEBIT];
    } catch {
      return [...INITIAL_CREDIT_DEBIT];
    }
  }

  saveCreditDebitRecords(records: CreditDebitRecord[]): void {
    try {
      const safeList = Array.isArray(records) ? records : [];
      this.safeSetItem(this.getKey(BASE_KEYS.CREDIT_DEBIT), JSON.stringify(safeList));
    } catch (e) {
      console.warn('Failed to save credit/debit records:', e);
    }
  }

  addCreditDebitRecord(
    record: Omit<CreditDebitRecord, 'id' | 'paidAmount' | 'remainingAmount' | 'status' | 'createdAt'>
  ): CreditDebitRecord {
    const list = this.getCreditDebitRecords();
    const newRecord: CreditDebitRecord = {
      ...record,
      id: `cd_${Date.now()}`,
      paidAmount: 0,
      remainingAmount: record.amount,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [newRecord, ...list];
    this.saveCreditDebitRecords(updated);
    return newRecord;
  }

  recordCreditDebitPayment(id: string, paymentAmount: number): CreditDebitRecord | null {
    const list = this.getCreditDebitRecords();
    const rec = list.find((r) => r.id === id);
    if (!rec) return null;

    const newPaid = Math.min(rec.amount, rec.paidAmount + paymentAmount);
    const newRemaining = Math.max(0, rec.amount - newPaid);
    const isTodayPastDue = new Date(rec.dueDate) < new Date();

    let newStatus = rec.status;
    if (newRemaining === 0) {
      newStatus = 'paid';
    } else if (newPaid > 0) {
      newStatus = isTodayPastDue ? 'overdue' : 'partially_paid';
    } else if (isTodayPastDue) {
      newStatus = 'overdue';
    }

    const updatedRec: CreditDebitRecord = {
      ...rec,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
    };

    const updatedList = list.map((r) => (r.id === id ? updatedRec : r));
    this.saveCreditDebitRecords(updatedList);
    return updatedRec;
  }

  deleteCreditDebitRecord(id: string): boolean {
    const list = this.getCreditDebitRecords();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      this.saveCreditDebitRecords(filtered);
      return true;
    }
    return false;
  }

  // --- Loans ---
  getLoans(): Loan[] {
    try {
      const data = this.safeGetItem(this.getKey(BASE_KEYS.LOANS));
      if (!data) return [...INITIAL_LOANS];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [...INITIAL_LOANS];
    } catch {
      return [...INITIAL_LOANS];
    }
  }

  saveLoans(loans: Loan[]): void {
    try {
      const safeList = Array.isArray(loans) ? loans : [];
      this.safeSetItem(this.getKey(BASE_KEYS.LOANS), JSON.stringify(safeList));
    } catch (e) {
      console.warn('Failed to save loans:', e);
    }
  }

  addLoan(loan: Omit<Loan, 'id' | 'paidAmount' | 'remainingAmount' | 'status' | 'repayments'>): Loan {
    const list = this.getLoans();
    const newLoan: Loan = {
      ...loan,
      id: `loan_${Date.now()}`,
      paidAmount: 0,
      remainingAmount: loan.principalAmount,
      status: 'active',
      repayments: [],
    };
    const updated = [newLoan, ...list];
    this.saveLoans(updated);
    return newLoan;
  }

  recordLoanRepayment(loanId: string, amount: number, notes?: string): Loan | null {
    const list = this.getLoans();
    const loan = list.find((l) => l.id === loanId);
    if (!loan) return null;

    const newPaid = Math.min(loan.principalAmount, loan.paidAmount + amount);
    const newRemaining = Math.max(0, loan.principalAmount - newPaid);
    const newStatus = newRemaining === 0 ? 'paid' : 'active';

    const updatedLoan: Loan = {
      ...loan,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      repayments: [
        {
          id: `lr_${Date.now()}`,
          amount,
          date: new Date().toISOString().split('T')[0],
          notes,
        },
        ...loan.repayments,
      ],
    };

    const updatedList = list.map((l) => (l.id === loanId ? updatedLoan : l));
    this.saveLoans(updatedList);
    return updatedLoan;
  }

  deleteLoan(loanId: string): boolean {
    const list = this.getLoans();
    const filtered = list.filter((l) => l.id !== loanId);
    if (filtered.length !== list.length) {
      this.saveLoans(filtered);
      return true;
    }
    return false;
  }

  // --- Backup / Restore / Reset ---
  exportAllData(): string {
    const payload = {
      profile: this.getProfile(),
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      budgets: this.getBudgets(),
      savings: this.getSavingsGoals(),
      creditDebit: this.getCreditDebitRecords(),
      loans: this.getLoans(),
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    return JSON.stringify(payload, null, 2);
  }

  importAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.profile) this.saveProfile(data.profile);
      if (Array.isArray(data.transactions)) this.saveTransactions(data.transactions);
      if (Array.isArray(data.categories)) this.saveCategories(data.categories);
      if (data.budgets) this.saveBudgets(data.budgets);
      if (Array.isArray(data.savings)) this.saveSavingsGoals(data.savings);
      if (Array.isArray(data.creditDebit)) this.saveCreditDebitRecords(data.creditDebit);
      if (Array.isArray(data.loans)) this.saveLoans(data.loans);
      return true;
    } catch (e) {
      console.error('Failed to import data', e);
      return false;
    }
  }

  exportFullBackup(): string {
    return this.exportAllData();
  }

  importFullBackup(jsonString: string): boolean {
    return this.importAllData(jsonString);
  }

  getTheme(): 'light' | 'dark' {
    const profile = this.getProfile();
    return profile.theme === 'dark' ? 'dark' : 'light';
  }

  setTheme(theme: 'light' | 'dark'): void {
    const profile = this.getProfile();
    profile.theme = theme;
    this.saveProfile(profile);
  }

  resetToEmptyData(): void {
    this.saveProfile({ ...INITIAL_USER_PROFILE, onboarded: false });
    this.saveTransactions([]);
    this.saveCategories(DEFAULT_CATEGORIES);
    this.saveBudgets({});
    this.saveSavingsGoals([]);
    this.saveCreditDebitRecords([]);
    this.saveLoans([]);
  }

  clearAllData(): void {
    const blankProfile: UserProfile = {
      ...INITIAL_USER_PROFILE,
      onboarded: false,
    };
    this.saveProfile(blankProfile);
    this.saveTransactions([]);
    this.saveCategories(DEFAULT_CATEGORIES);
    this.saveBudgets({});
    this.saveSavingsGoals([]);
    this.saveCreditDebitRecords([]);
    this.saveLoans([]);
  }

  /** Return the active user's complete local cache for offline fallback/export. */
  getCurrentSnapshot(): TrackerData {
    return {
      profile: this.getProfile(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      budgets: this.getBudgets(),
      savingsGoals: this.getSavingsGoals(),
      creditDebitRecords: this.getCreditDebitRecords(),
      loans: this.getLoans(),
    };
  }

  /**
   * Reserve unscoped pre-auth data for the first UID that claims it. The marker
   * is written before any network work so a second account cannot adopt it if
   * the first account's migration is interrupted. The legacy values are kept.
   */
  claimLegacyDataForUser(userId: string): boolean {
    const owner = this.safeGetItem(LEGACY_OWNER_KEY);
    if (owner) return owner === userId;

    const hasLegacyData = Object.values(BASE_KEYS).some((key) => this.safeGetItem(key) !== null);
    if (!hasLegacyData) return false;

    this.safeSetItem(LEGACY_OWNER_KEY, userId);
    return true;
  }

  /** Read exact persisted values, not getter defaults, for safe migration. */
  getMigrationSources(userId: string, includeLegacy: boolean): TrackerDataSources {
    const readSnapshot = (suffix: string): PartialTrackerData => {
      const read = <T,>(baseKey: string): T | undefined => {
        const raw = this.safeGetItem(`${baseKey}${suffix}`);
        if (raw === null) return undefined;
        try {
          return JSON.parse(raw) as T;
        } catch {
          // Keep malformed local values untouched; the app's existing getters
          // provide their usual safe defaults and the user can still export it.
          return undefined;
        }
      };
      const readArray = <T,>(baseKey: string): T[] | undefined => {
        const value = read<unknown>(baseKey);
        return Array.isArray(value) ? value as T[] : undefined;
      };
      const profile = read<unknown>(BASE_KEYS.PROFILE);
      const budgets = read<unknown>(BASE_KEYS.BUDGETS);

      return {
        profile: profile && typeof profile === 'object' && !Array.isArray(profile) ? profile as UserProfile : undefined,
        transactions: readArray<Transaction>(BASE_KEYS.TRANSACTIONS),
        categories: readArray<Category>(BASE_KEYS.CATEGORIES),
        budgets: budgets && typeof budgets === 'object' && !Array.isArray(budgets)
          ? budgets as Record<string, MonthlyBudget>
          : undefined,
        savingsGoals: readArray<SavingsGoal>(BASE_KEYS.SAVINGS),
        creditDebitRecords: readArray<CreditDebitRecord>(BASE_KEYS.CREDIT_DEBIT),
        loans: readArray<Loan>(BASE_KEYS.LOANS),
      };
    };

    return {
      user: readSnapshot(`_${userId}`),
      legacy: includeLegacy ? readSnapshot('') : {},
    };
  }

  /** Update only this UID's local cache after a verified Firestore snapshot. */
  applyCloudSnapshot(data: TrackerData): void {
    this.saveProfile(data.profile);
    this.saveCategories(data.categories);
    this.saveTransactions(data.transactions);
    this.saveBudgets(data.budgets);
    this.saveSavingsGoals(data.savingsGoals);
    this.saveCreditDebitRecords(data.creditDebitRecords);
    this.saveLoans(data.loans);
  }
}

export const storageService = new StorageService();
