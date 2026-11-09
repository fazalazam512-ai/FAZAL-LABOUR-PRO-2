import {
  Transaction,
  MonthlyBudget,
  MonthlyFinancialSummary,
  Category,
  CategorySummary,
  SmartInsight,
  SavingsGoal,
  CreditDebitRecord,
  Loan,
  CurrencyCode,
} from '../types';
import { formatMoney } from '../constants/currencies';

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Filter transactions for a given month formatted as 'YYYY-MM'
 */
export function getTransactionsForMonth(transactions: Transaction[], monthStr: string): Transaction[] {
  if (!Array.isArray(transactions) || !monthStr) return [];
  return transactions.filter((t) => t && t.date && t.date.startsWith(monthStr));
}

/**
 * Compute the comprehensive monthly financial summary
 */
export function calculateMonthlySummary(
  transactions: Transaction[] = [],
  budget: MonthlyBudget | undefined,
  categories: Category[] = [],
  creditDebitRecords: CreditDebitRecord[] = [],
  loans: Loan[] = [],
  savingsGoals: SavingsGoal[] = [],
  monthStr: string = '2026-09'
): MonthlyFinancialSummary {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeCreditDebit = Array.isArray(creditDebitRecords) ? creditDebitRecords : [];
  const safeLoans = Array.isArray(loans) ? loans : [];

  const safeMonthStr =
    monthStr && typeof monthStr === 'string' && monthStr.includes('-')
      ? monthStr
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const monthTransactions = getTransactionsForMonth(safeTransactions, safeMonthStr);

  let totalIncome = 0;
  let totalExpenses = 0;
  let netSavings = 0;

  // Category spent accumulator
  const categorySpentMap: Record<string, { spent: number; count: number }> = {};
  // Daily spending map for charts
  const dailySpendingMap: Record<number, { expense: number; income: number }> = {};

  // Days in month
  const [yearStr, monthNumStr] = safeMonthStr.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const monthIndex = (parseInt(monthNumStr, 10) || 1) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    dailySpendingMap[d] = { expense: 0, income: 0 };
  }

  for (const t of monthTransactions) {
    if (!t) continue;
    const amount = Number(t.amount) || 0;
    const dateParts = (t.date || '').split('-');
    const day = dateParts.length >= 3 ? parseInt(dateParts[2], 10) || 1 : 1;

    if (t.type === 'expense') {
      totalExpenses += amount;
      const catId = t.categoryId || 'cat_other';
      if (!categorySpentMap[catId]) {
        categorySpentMap[catId] = { spent: 0, count: 0 };
      }
      categorySpentMap[catId].spent += amount;
      categorySpentMap[catId].count += 1;

      if (!dailySpendingMap[day]) {
        dailySpendingMap[day] = { expense: 0, income: 0 };
      }
      dailySpendingMap[day].expense += amount;
    } else if (t.type === 'income') {
      totalIncome += amount;
      if (!dailySpendingMap[day]) {
        dailySpendingMap[day] = { expense: 0, income: 0 };
      }
      dailySpendingMap[day].income += amount;
    } else if (t.type === 'savings') {
      netSavings += amount;
    } else if (t.type === 'loan_repayment') {
      // Loan repayment is a cash outflow
      totalExpenses += amount;
    }
  }

  // Credit & Debit overall tracking
  let totalCredit = 0; // Money we owe or received on credit
  let totalDebit = 0; // Money owed to us
  for (const cd of safeCreditDebit) {
    if (!cd) continue;
    if (cd.type === 'credit') {
      totalCredit += Number(cd.remainingAmount) || 0;
    } else {
      totalDebit += Number(cd.remainingAmount) || 0;
    }
  }

  // Loans overall tracking
  let outstandingLoans = 0;
  for (const loan of safeLoans) {
    if (!loan) continue;
    if (loan.status !== 'paid') {
      outstandingLoans += Number(loan.remainingAmount) || 0;
    }
  }

  const budgetLimit = budget?.totalBudget || 0;
  const remainingBudget = roundMoney(budgetLimit - totalExpenses);
  const budgetUsedPercentage = budgetLimit > 0 ? Math.round((totalExpenses / budgetLimit) * 100) : 0;

  const isWarn75 = budgetUsedPercentage >= 75 && budgetUsedPercentage < 90;
  const isWarn90 = budgetUsedPercentage >= 90 && budgetUsedPercentage < 100;
  const isWarn100 = budgetUsedPercentage === 100;
  const isExceeded = budgetUsedPercentage > 100;

  // Build category summaries
  const categorySummaries: CategorySummary[] = safeCategories
    .filter((c) => c && c.type === 'expense')
    .map((cat) => {
      const stats = categorySpentMap[cat.id] || { spent: 0, count: 0 };
      const catBudget = budget?.categoryBudgets?.[cat.id] || 0;
      const pct = catBudget > 0 ? Math.round((stats.spent / catBudget) * 100) : 0;
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        icon: cat.icon,
        color: cat.color,
        spent: roundMoney(stats.spent),
        budget: catBudget,
        percentage: pct,
        transactionCount: stats.count,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  // Build daily spending chart series
  const dailySpending = Object.entries(dailySpendingMap).map(([day, val]) => ({
    date: `${safeMonthStr}-${String(day).padStart(2, '0')}`,
    day: parseInt(day, 10),
    expense: roundMoney(val.expense),
    income: roundMoney(val.income),
  }));

  return {
    month: safeMonthStr,
    totalIncome: roundMoney(totalIncome),
    totalExpenses: roundMoney(totalExpenses),
    remainingBudget,
    netSavings: roundMoney(netSavings),
    totalCredit: roundMoney(totalCredit),
    totalDebit: roundMoney(totalDebit),
    outstandingLoans: roundMoney(outstandingLoans),
    budgetLimit: roundMoney(budgetLimit),
    budgetUsedPercentage,
    isWarn75,
    isWarn90,
    isWarn100,
    isExceeded,
    categorySummaries,
    dailySpending,
  };
}

/**
 * Generate Actionable Financial Insights
 */
export function generateSmartInsights(
  current: MonthlyFinancialSummary | undefined,
  previous: MonthlyFinancialSummary | null | undefined,
  savingsGoals: SavingsGoal[] = [],
  currency: CurrencyCode = 'PKR'
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  if (!current) return insights;

  const safeGoals = Array.isArray(savingsGoals) ? savingsGoals : [];
  const safeCategories = Array.isArray(current.categorySummaries) ? current.categorySummaries : [];

  // 1. Budget Usage Insight
  if (current.budgetLimit > 0) {
    if (current.isExceeded) {
      insights.push({
        id: 'budget_exceeded',
        type: 'warning',
        title: 'Budget Exceeded',
        message: `You have exceeded your monthly budget by ${formatMoney(Math.abs(current.remainingBudget), currency)} (${current.budgetUsedPercentage}% spent).`,
      });
    } else if (current.isWarn90) {
      insights.push({
        id: 'budget_90',
        type: 'warning',
        title: 'Budget Caution (90%+)',
        message: `You have utilized ${current.budgetUsedPercentage}% of your budget. Only ${formatMoney(current.remainingBudget, currency)} remains.`,
      });
    } else if (current.isWarn75) {
      insights.push({
        id: 'budget_75',
        type: 'info',
        title: 'Budget Alert',
        message: `You have consumed ${current.budgetUsedPercentage}% of your budget with ${formatMoney(current.remainingBudget, currency)} left.`,
      });
    } else {
      insights.push({
        id: 'budget_healthy',
        type: 'positive',
        title: 'Budget On Track',
        message: `You have ${formatMoney(current.remainingBudget, currency)} (${100 - current.budgetUsedPercentage}%) remaining from your monthly budget.`,
      });
    }
  }

  // 2. Top Category Spending Insight
  const topSpentCat = safeCategories.find((c) => c && c.spent > 0);
  if (topSpentCat && current.totalExpenses > 0) {
    const pctOfTotal = Math.round((topSpentCat.spent / current.totalExpenses) * 100);
    insights.push({
      id: 'top_cat_insight',
      type: 'info',
      title: 'Primary Expense Driver',
      message: `${topSpentCat.categoryName} is your largest expense category this month, accounting for ${pctOfTotal}% (${formatMoney(topSpentCat.spent, currency)}) of total spending.`,
    });
  }

  // 3. Month-to-Month Spending Trend
  if (previous && previous.totalExpenses > 0) {
    const diff = current.totalExpenses - previous.totalExpenses;
    const pctChange = Math.round((Math.abs(diff) / previous.totalExpenses) * 100);

    if (diff > 0) {
      insights.push({
        id: 'trend_higher',
        type: 'trend',
        title: 'Spending Increased',
        message: `Your spending is ${pctChange}% higher (${formatMoney(diff, currency)}) compared to the same period last month.`,
      });
    } else if (diff < 0) {
      insights.push({
        id: 'trend_lower',
        type: 'positive',
        title: 'Spending Decreased',
        message: `Excellent! Your spending decreased by ${pctChange}% (${formatMoney(Math.abs(diff), currency)}) compared to last month.`,
      });
    }
  }

  // 4. Savings Goal Progress Insight
  if (safeGoals.length > 0) {
    const activeGoal = safeGoals.find((g) => g && g.currentAmount < g.targetAmount) || safeGoals[0];
    if (activeGoal && activeGoal.targetAmount > 0) {
      const progress = Math.min(100, Math.round((activeGoal.currentAmount / activeGoal.targetAmount) * 100));
      insights.push({
        id: 'savings_progress',
        type: 'positive',
        title: 'Savings Milestone',
        message: `You are ${progress}% toward your "${activeGoal.name}" goal (${formatMoney(activeGoal.currentAmount, currency)} of ${formatMoney(activeGoal.targetAmount, currency)} saved).`,
      });
    }
  }

  return insights;
}
