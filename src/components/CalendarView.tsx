import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Transaction, Category, CurrencyCode } from '../types';
import { formatMoney } from '../constants/currencies';
import { CategoryIcon } from './CategoryIcon';

interface CalendarViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  selectedMonth: string;
  onChangeMonth: (offset: number) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  transactions,
  categories,
  currency,
  selectedMonth,
  onChangeMonth,
  onSelectTransaction,
}) => {
  const safeMonth = selectedMonth && typeof selectedMonth === 'string' && selectedMonth.includes('-')
    ? selectedMonth
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = safeMonth.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1); // 1-indexed

  // Today's date
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDayDate, setSelectedDayDate] = useState<string>(
    todayStr.startsWith(safeMonth) ? todayStr : `${safeMonth}-01`
  );

  // Month header text
  const monthDate = new Date(year, month - 1, 1);
  const formattedMonth = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Compute days in month and start day offset (0 = Sunday)
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // Aggregate financial metrics per day for this month
  const dailyData: Record<number, { expense: number; income: number; count: number }> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailyData[d] = { expense: 0, income: 0, count: 0 };
  }

  for (const tx of safeTransactions) {
    if (tx && tx.date && tx.date.startsWith(safeMonth)) {
      const dayNum = parseInt(tx.date.split('-')[2], 10);
      if (dailyData[dayNum]) {
        if (tx.type === 'expense' || tx.type === 'loan_repayment') {
          dailyData[dayNum].expense += tx.amount;
          dailyData[dayNum].count += 1;
        } else if (tx.type === 'income') {
          dailyData[dayNum].income += tx.amount;
          dailyData[dayNum].count += 1;
        }
      }
    }
  }

  // Transactions for the currently clicked date
  const dayTransactions = transactions.filter((t) => t.date === selectedDayDate);

  const dayDateObj = new Date(selectedDayDate);
  const formattedDayTitle = dayDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div id="calendar-view" className="space-y-6 pb-12">
      {/* Header with Month switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600" />
            <span>Financial Calendar</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspect daily cash flow and activity density across the month
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => onChangeMonth(-1)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[130px] text-center">
            {formattedMonth}
          </span>
          <button
            onClick={() => onChangeMonth(1)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid Matrix */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank offset pads */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 rounded-xl bg-slate-50/40 dark:bg-slate-800/20" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
              const data = dailyData[dayNum] || { expense: 0, income: 0, count: 0 };
              const isSelected = selectedDayDate === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={dateStr}
                  id={`calendar-day-${dayNum}`}
                  onClick={() => setSelectedDayDate(dateStr)}
                  className={`h-20 sm:h-24 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/30'
                      : isToday
                      ? 'border-emerald-400 bg-white dark:bg-slate-800'
                      : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday
                          ? 'bg-emerald-600 text-white'
                          : isSelected
                          ? 'text-emerald-700 dark:text-emerald-300 font-extrabold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {data.count > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden text-[9px] sm:text-[10px]">
                    {data.income > 0 && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold truncate">
                        +{formatMoney(data.income, currency, { showCents: false })}
                      </div>
                    )}
                    {data.expense > 0 && (
                      <div className="text-rose-600 dark:text-rose-400 font-bold truncate">
                        -{formatMoney(data.expense, currency, { showCents: false })}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Activity Sidebar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Selected Date</span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {formattedDayTitle}
              </h2>
            </div>

            {/* List for this day */}
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto">
              {dayTransactions.length > 0 ? (
                dayTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const isIncome = tx.type === 'income';

                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cat?.color || '#64748b'}20` }}
                        >
                          <CategoryIcon
                            iconName={cat?.icon || 'HelpCircle'}
                            className="w-4 h-4"
                            color={cat?.color || '#64748b'}
                          />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[130px]">
                            {tx.description}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {tx.time || '12:00'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-bold ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency)}
                        </span>
                        <div className="text-[9px] uppercase text-slate-400 font-semibold">
                          {tx.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No transactions recorded on this day.
                </div>
              )}
            </div>
          </div>

          {/* Daily Net Summary */}
          {dayTransactions.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Daily Net</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatMoney(
                  dayTransactions.reduce((acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount), 0),
                  currency
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
