export type CurrencyCode =
  | 'PKR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AED'
  | 'SAR'
  | 'INR'
  | 'CAD'
  | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export type TransactionType =
  | 'expense'
  | 'income'
  | 'savings'
  | 'credit'
  | 'debit'
  | 'loan_received'
  | 'loan_repayment';

export type PaymentMethod =
  | 'Cash'
  | 'Bank'
  | 'Debit Card'
  | 'Credit Card'
  | 'Easypaisa'
  | 'JazzCash'
  | 'Bank Transfer'
  | 'Other';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  subcategories?: string[];
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  categoryId: string;
  subcategoryId?: string;
  description: string;
  merchant?: string;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudget {
  id: string;
  month: string; // YYYY-MM
  totalBudget: number;
  categoryBudgets: Record<string, number>; // categoryId -> amount
  warningThresholds: {
    warn75: boolean;
    warn90: boolean;
    warn100: boolean;
  };
}

export interface SavingsTransaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  date: string;
  notes?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  notes?: string;
  history: SavingsTransaction[];
  createdAt: string;
}

export type CreditDebitType = 'credit' | 'debit';
export type CreditDebitStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue';

export interface CreditDebitRecord {
  id: string;
  type: CreditDebitType; // 'credit' = received/owe, 'debit' = lent/receivable
  person: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: CreditDebitStatus;
  description?: string;
  notes?: string;
  createdAt: string;
}

export interface LoanRepayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Loan {
  id: string;
  name: string;
  lender: string;
  type: 'borrowed' | 'lent';
  principalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  interestRate?: number;
  installmentAmount?: number;
  frequency?: 'monthly' | 'weekly' | 'one_time';
  startDate: string;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue';
  notes?: string;
  repayments: LoanRepayment[];
}

export interface UserProfile {
  name: string;
  email?: string;
  defaultCurrency: CurrencyCode;
  currency?: CurrencyCode;
  theme: 'light' | 'dark' | 'system';
  defaultMonthlyBudget: number;
  onboarded: boolean;
  alert75: boolean;
  alert90: boolean;
  alert100: boolean;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  spent: number;
  budget: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyFinancialSummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  remainingBudget: number;
  netSavings: number;
  totalCredit: number;
  totalDebit: number;
  outstandingLoans: number;
  budgetLimit: number;
  budgetUsedPercentage: number;
  isWarn75: boolean;
  isWarn90: boolean;
  isWarn100: boolean;
  isExceeded: boolean;
  categorySummaries: CategorySummary[];
  dailySpending: { date: string; day: number; expense: number; income: number }[];
}

export interface SmartInsight {
  id: string;
  type: 'info' | 'warning' | 'positive' | 'trend';
  title: string;
  message: string;
}

export type ViewTab =
  | 'dashboard'
  | 'transactions'
  | 'add'
  | 'budget'
  | 'savings'
  | 'credit_debit'
  | 'loans'
  | 'calendar'
  | 'reports'
  | 'categories'
  | 'settings'
  | 'admin';

export type NavigationTab = ViewTab;
