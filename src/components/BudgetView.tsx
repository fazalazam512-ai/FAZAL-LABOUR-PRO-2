import React, { useState } from 'react';
import {
  PieChart,
  AlertTriangle,
  Edit3,
  Check,
  Plus,
  TrendingDown,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  MonthlyBudget,
  MonthlyFinancialSummary,
  Category,
  CurrencyCode,
} from '../types';
import { formatMoney } from '../constants/currencies';
import { CategoryIcon } from './CategoryIcon';

interface BudgetViewProps {
  budget: MonthlyBudget;
  summary: MonthlyFinancialSummary;
  categories: Category[];
  currency: CurrencyCode;
  selectedMonth: string;
  onUpdateBudget: (updates: Partial<MonthlyBudget>) => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  budget,
  summary,
  categories,
  currency,
  selectedMonth,
  onUpdateBudget,
}) => {
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const totalBudgetVal = budget?.totalBudget ?? 0;
  const [totalBudgetInput, setTotalBudgetInput] = useState(totalBudgetVal.toString());
  const [editingCategoryBudget, setEditingCategoryBudget] = useState<{
    categoryId: string;
    amount: string;
  } | null>(null);

  const safeMonth = selectedMonth && typeof selectedMonth === 'string' && selectedMonth.includes('-')
    ? selectedMonth
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [year, month] = safeMonth.split('-');
  const monthDate = new Date(parseInt(year, 10) || new Date().getFullYear(), (parseInt(month, 10) || 1) - 1, 1);
  const formattedMonth = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const safeCategories = Array.isArray(categories) ? categories : [];
  const expenseCategories = safeCategories.filter((c) => c && c.type === 'expense');

  const handleSaveTotalBudget = () => {
    const num = parseFloat(totalBudgetInput);
    if (!isNaN(num) && num >= 0) {
      onUpdateBudget({ totalBudget: num });
      setIsEditingTotal(false);
    }
  };

  const handleSaveCategoryBudget = () => {
    if (!editingCategoryBudget) return;
    const num = parseFloat(editingCategoryBudget.amount);
    if (!isNaN(num) && num >= 0) {
      const updatedCatBudgets = {
        ...(budget.categoryBudgets || {}),
        [editingCategoryBudget.categoryId]: num,
      };
      onUpdateBudget({ categoryBudgets: updatedCatBudgets });
      setEditingCategoryBudget(null);
    }
  };

  return (
    <div id="budget-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Budget Management ({formattedMonth})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure spending limits and monitor category consumption thresholds
          </p>
        </div>

        {/* Edit Total Budget Action */}
        {!isEditingTotal ? (
          <button
            id="edit-total-budget-btn"
            onClick={() => {
              setTotalBudgetInput(budget.totalBudget.toString());
              setIsEditingTotal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Set Overall Budget</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={totalBudgetInput}
              onChange={(e) => setTotalBudgetInput(e.target.value)}
              className="w-32 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleSaveTotalBudget}
              className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Budget Card Overview */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Monthly Limit</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {formatMoney(budget.totalBudget, currency)}
            </div>
            <span className="text-[10px] text-slate-500">Planned spending</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Actual Expenses</span>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {formatMoney(summary.totalExpenses, currency)}
            </div>
            <span className="text-[10px] text-slate-500">Consumed so far</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Remaining Balance</span>
            <div
              className={`text-xl font-extrabold mt-1 ${
                summary.isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {formatMoney(summary.remainingBudget, currency)}
            </div>
            <span className="text-[10px] text-slate-500">
              {summary.isExceeded ? 'Over budget limit' : 'Available to spend'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Budget Status</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {summary.budgetUsedPercentage}% Used
            </div>
            <span className="text-[10px] text-slate-500">
              {Math.max(0, 100 - summary.budgetUsedPercentage)}% remaining
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.isExceeded
                  ? 'bg-rose-500'
                  : summary.budgetUsedPercentage >= 90
                  ? 'bg-amber-500'
                  : summary.budgetUsedPercentage >= 75
                  ? 'bg-yellow-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, summary.budgetUsedPercentage)}%` }}
            />
          </div>

          {/* Threshold markers */}
          <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
            <span>0%</span>
            <span className={summary.budgetUsedPercentage >= 75 ? 'text-yellow-600 font-bold' : ''}>75% Alert</span>
            <span className={summary.budgetUsedPercentage >= 90 ? 'text-amber-600 font-bold' : ''}>90% Caution</span>
            <span className={summary.isExceeded ? 'text-rose-600 font-bold' : ''}>100% Exceeded</span>
          </div>
        </div>

        {/* Warning Callout when threshold exceeded */}
        {summary.isExceeded && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Budget Exceeded!</strong> You have spent {formatMoney(Math.abs(summary.remainingBudget), currency)} over your planned budget of {formatMoney(budget.totalBudget, currency)}.
            </span>
          </div>
        )}
      </div>

      {/* Category Budgets Breakdown (PRD Section 8) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Category Budgets</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set specific limits per expense category to prevent overspending
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenseCategories.map((cat) => {
            const catSummary = summary.categorySummaries.find((c) => c.categoryId === cat.id);
            const spent = catSummary?.spent || 0;
            const catBudgetLimit = budget.categoryBudgets?.[cat.id] || 0;
            const pctUsed = catBudgetLimit > 0 ? Math.round((spent / catBudgetLimit) * 100) : 0;
            const remaining = catBudgetLimit - spent;
            const isOverCat = catBudgetLimit > 0 && spent > catBudgetLimit;

            return (
              <div
                key={cat.id}
                id={`cat-budget-${cat.id}`}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <CategoryIcon iconName={cat.icon} className="w-4 h-4" color={cat.color} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {catSummary?.transactionCount || 0} transactions
                      </span>
                    </div>
                  </div>

                  {/* Edit or set limit button */}
                  <button
                    id={`edit-cat-budget-${cat.id}`}
                    onClick={() =>
                      setEditingCategoryBudget({
                        categoryId: cat.id,
                        amount: catBudgetLimit.toString(),
                      })
                    }
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{catBudgetLimit > 0 ? 'Edit Limit' : 'Set Limit'}</span>
                  </button>
                </div>

                {/* Numbers */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Spent</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatMoney(spent, currency)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Budget Limit</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {catBudgetLimit > 0 ? formatMoney(catBudgetLimit, currency) : 'No limit'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {catBudgetLimit > 0 ? (
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverCat ? 'bg-rose-500' : pctUsed >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pctUsed)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={isOverCat ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                        {pctUsed}% utilized
                      </span>
                      <span className={isOverCat ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                        {isOverCat
                          ? `${formatMoney(Math.abs(remaining), currency)} exceeded`
                          : `${formatMoney(remaining, currency)} remaining`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic">
                    Tap &quot;Set Limit&quot; to assign a budget for {cat.name}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Category Budget Modal */}
      {editingCategoryBudget && (
        <div
          id="edit-cat-budget-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingCategoryBudget(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Set Category Budget Limit
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter monthly spending cap for this category ({currency})
              </p>
            </div>

            <div>
              <input
                type="number"
                step="any"
                value={editingCategoryBudget.amount}
                onChange={(e) =>
                  setEditingCategoryBudget({
                    ...editingCategoryBudget,
                    amount: e.target.value,
                  })
                }
                placeholder="e.g. 20000"
                className="w-full py-2.5 px-3 rounded-xl text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCategoryBudget(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                id="save-cat-budget-btn"
                onClick={handleSaveCategoryBudget}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save Limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
