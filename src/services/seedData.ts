import {
  Transaction,
  MonthlyBudget,
  SavingsGoal,
  CreditDebitRecord,
  Loan,
  UserProfile,
} from '../types';

// New accounts start with a neutral profile and no financial records.
export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Expense Manager',
  defaultCurrency: 'PKR',
  theme: 'system',
  defaultMonthlyBudget: 0,
  onboarded: false,
  alert75: true,
  alert90: true,
  alert100: true,
};

export const INITIAL_BUDGETS: Record<string, MonthlyBudget> = {};
export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [];
export const INITIAL_CREDIT_DEBIT: CreditDebitRecord[] = [];
export const INITIAL_LOANS: Loan[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
