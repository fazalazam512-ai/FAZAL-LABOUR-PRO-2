import React, { useState, useMemo } from 'react';
import {
  FileBarChart2,
  Download,
  Printer,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  Transaction,
  MonthlyBudget,
  Category,
  CreditDebitRecord,
  Loan,
  CurrencyCode,
} from '../types';
import { formatMoney } from '../constants/currencies';
import { CategoryIcon } from './CategoryIcon';

interface ReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  budget: MonthlyBudget;
  creditDebitRecords: CreditDebitRecord[];
  loans: Loan[];
  currency: CurrencyCode;
  selectedMonth: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  categories,
  budget,
  creditDebitRecords,
  loans,
  currency,
  selectedMonth,
}) => {
  const [period, setPeriod] = useState<'this_month' | 'last_30_days' | 'this_year' | 'all_time'>('this_month');

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeMonth = selectedMonth && typeof selectedMonth === 'string' && selectedMonth.includes('-')
    ? selectedMonth
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Filter transactions according to selected period
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    return safeTransactions.filter((t) => {
      if (!t || !t.date) return false;
      const txDate = new Date(t.date);
      if (period === 'this_month') {
        return t.date.startsWith(safeMonth);
      }
      if (period === 'last_30_days') {
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return txDate >= thirtyDaysAgo && txDate <= today;
      }
      if (period === 'this_year') {
        const currentYear = safeMonth.split('-')[0];
        return t.date.startsWith(currentYear);
      }
      return true; // all_time
    });
  }, [safeTransactions, period, safeMonth]);

  // Calculations
  const reportTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let savings = 0;
    const catSpentMap: Record<string, number> = {};

    for (const t of filteredTransactions) {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense' || t.type === 'loan_repayment') {
        expense += t.amount;
        catSpentMap[t.categoryId] = (catSpentMap[t.categoryId] || 0) + t.amount;
      } else if (t.type === 'savings') {
        savings += t.amount;
      }
    }

    const categoryBreakdown = categories
      .filter((c) => c.type === 'expense')
      .map((c) => ({
        name: c.name,
        color: c.color,
        icon: c.icon,
        spent: catSpentMap[c.id] || 0,
        pct: expense > 0 ? Math.round(((catSpentMap[c.id] || 0) / expense) * 100) : 0,
      }))
      .filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    return {
      income,
      expense,
      savings,
      net: income - expense,
      txCount: filteredTransactions.length,
      categoryBreakdown,
    };
  }, [filteredTransactions, categories]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Time', 'Type', 'Category', 'Amount', 'Currency', 'Payment Method', 'Description', 'Merchant', 'Notes'];
    const rows = filteredTransactions.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)?.name || 'General';
      return [
        `"${t.id}"`,
        `"${t.date}"`,
        `"${t.time}"`,
        `"${t.type}"`,
        `"${cat}"`,
        t.amount,
        `"${t.currency}"`,
        `"${t.paymentMethod}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.merchant || '').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_report_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-view" className="space-y-6 pb-12">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-emerald-600" />
            <span>Financial Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate audited statements, analyze category trends, and export records
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setPeriod('this_month')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            period === 'this_month'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Selected Month
        </button>
        <button
          onClick={() => setPeriod('last_30_days')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            period === 'last_30_days'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setPeriod('this_year')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            period === 'this_year'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          This Year
        </button>
        <button
          onClick={() => setPeriod('all_time')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            period === 'all_time'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Time
        </button>
      </div>

      {/* High-Level Report Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Inflow</span>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatMoney(reportTotals.income, currency)}
          </div>
          <span className="text-[10px] text-slate-400">Total received</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Outflow</span>
          <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {formatMoney(reportTotals.expense, currency)}
          </div>
          <span className="text-[10px] text-slate-400">Total spent</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Savings / Surplus</span>
          <div
            className={`text-xl font-extrabold mt-1 ${
              reportTotals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(reportTotals.net, currency)}
          </div>
          <span className="text-[10px] text-slate-400">Inflows minus outflows</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Transaction Count</span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {reportTotals.txCount}
          </div>
          <span className="text-[10px] text-slate-400">Recorded records</span>
        </div>
      </div>

      {/* Category Breakdown & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Category Breakdown Table
          </h2>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reportTotals.categoryBreakdown.length > 0 ? (
              reportTotals.categoryBreakdown.map((c) => (
                <div key={c.name} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatMoney(c.spent, currency)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2">({c.pct}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No expense transactions recorded in this period.
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            Expense Allocation Distribution
          </h2>

          <div className="h-64 w-full">
            {reportTotals.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportTotals.categoryBreakdown}
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="spent"
                  >
                    {reportTotals.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatMoney(Number(val) || 0, currency)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No data available for chart visualization.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
