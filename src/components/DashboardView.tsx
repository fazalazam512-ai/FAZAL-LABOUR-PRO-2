import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  MonthlyFinancialSummary,
  Transaction,
  Category,
  CurrencyCode,
  SmartInsight,
  ViewTab,
} from '../types';
import { formatMoney } from '../constants/currencies';
import { CategoryIcon } from './CategoryIcon';
import { ReceiptModal } from './ReceiptModal';

interface DashboardViewProps {
  summary: MonthlyFinancialSummary;
  previousSummary: MonthlyFinancialSummary | null;
  selectedMonth: string;
  onChangeMonth: (offset: number) => void;
  currency: CurrencyCode;
  insights: SmartInsight[];
  recentTransactions: Transaction[];
  categories: Category[];
  onOpenAddModal: (prefillType?: 'expense' | 'income') => void;
  onSelectTransaction: (tx: Transaction) => void;
  setActiveTab: (tab: ViewTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  previousSummary,
  selectedMonth,
  onChangeMonth,
  currency,
  insights,
  recentTransactions,
  categories,
  onOpenAddModal,
  onSelectTransaction,
  setActiveTab,
}) => {
  const [previewReceiptTx, setPreviewReceiptTx] = useState<Transaction | null>(null);
  const safeMonth = selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)
    ? selectedMonth
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const monthDate = new Date(`${safeMonth}-01T00:00:00`);
  const formattedMonth = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const previousLabel = previousSummary?.month
    ? new Date(`${previousSummary.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'last month';

  const safeSummary: MonthlyFinancialSummary = summary || {
    month: safeMonth,
    totalIncome: 0,
    totalExpenses: 0,
    remainingBudget: 0,
    netSavings: 0,
    totalCredit: 0,
    totalDebit: 0,
    outstandingLoans: 0,
    budgetLimit: 0,
    budgetUsedPercentage: 0,
    isWarn75: false,
    isWarn90: false,
    isWarn100: false,
    isExceeded: false,
    categorySummaries: [],
    dailySpending: [],
  };
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeTransactions = Array.isArray(recentTransactions) ? recentTransactions : [];
  const safeInsights = Array.isArray(insights) ? insights : [];
  const categoryRows = (safeSummary.categorySummaries || []).filter((item) => item && item.spent > 0).slice(0, 5);
  const categoryCount = (safeSummary.categorySummaries || []).filter((item) => item && item.spent > 0).length;
  const categoryMaximum = Math.max(1, ...categoryRows.map((item) => item.spent));
  const netFlow = safeSummary.totalIncome - safeSummary.totalExpenses;
  const budgetUse = Math.max(0, safeSummary.budgetUsedPercentage || 0);
  const chartHasData = (safeSummary.dailySpending || []).some((day) => day.expense > 0 || day.income > 0);

  return (
    <div id="dashboard-view" className="dashboard-view">
      <section className="dashboard-heading">
        <div>
          <p className="section-kicker">MONEY, MADE CLEAR <span aria-hidden="true">/</span> {currency}</p>
          <h1>Your money, in focus.</h1>
          <p className="dashboard-subtitle">A calm read on what came in, what went out, and what’s still yours.</p>
        </div>
        <div className="dashboard-tools">
          <button type="button" className="button-3d dashboard-add-button" onClick={() => onOpenAddModal()}>
            <Plus aria-hidden="true" /><span>Record transaction</span>
          </button>
          <div className="month-switcher" aria-label="Choose reporting month">
            <button id="prev-month-btn" type="button" onClick={() => onChangeMonth(-1)} aria-label="Previous month">
              <ChevronLeft aria-hidden="true" />
            </button>
            <span>{formattedMonth}</span>
            <button id="next-month-btn" type="button" onClick={() => onChangeMonth(1)} aria-label="Next month">
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section className="cashflow-hero" aria-labelledby="cashflow-title">
        <div className="cashflow-main">
          <p className="cashflow-label" id="cashflow-title">NET CASH FLOW <span>{formattedMonth}</span></p>
          <p className={`cashflow-amount${netFlow < 0 ? ' is-negative' : ''}`}>{formatMoney(netFlow, currency)}</p>
          <p className="cashflow-caption">Income minus expenses for this period</p>
          {previousSummary && (
            <div className={`cashflow-comparison${netFlow >= previousSummary.totalIncome - previousSummary.totalExpenses ? ' is-positive' : ''}`}>
              <TrendingUp aria-hidden="true" />
              <span>Compared with {previousLabel}</span>
            </div>
          )}
        </div>
        <div className="hero-rule" aria-hidden="true" />
        <div className="budget-glance">
          <div className="budget-glance-top">
            <span className="budget-glance-icon"><Wallet aria-hidden="true" /></span>
            <span className="budget-glance-status">
              {safeSummary.isExceeded ? 'Over budget' : safeSummary.budgetLimit > 0 ? 'Monthly budget' : 'Set a budget'}
            </span>
          </div>
          <div className="budget-glance-amount">
            {safeSummary.budgetLimit > 0 ? formatMoney(safeSummary.remainingBudget, currency) : '—'}
          </div>
          <div className="budget-progress-track" role="progressbar" aria-label="Budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(budgetUse))}>
            <span className={safeSummary.isExceeded ? 'is-over' : ''} style={{ width: `${Math.min(100, budgetUse)}%` }} />
          </div>
          <div className="budget-glance-footer">
            <span>{formatMoney(safeSummary.totalExpenses, currency)} spent</span>
            <span>{safeSummary.budgetLimit > 0 ? `${Math.round(budgetUse)}% used` : 'No limit set'}</span>
          </div>
          <button type="button" className="text-action" onClick={() => setActiveTab('budget')}>Review budget <ChevronRight aria-hidden="true" /></button>
        </div>
      </section>

      <section className="metric-strip" aria-label="Monthly totals">
        <article className="metric-card metric-income">
          <div className="metric-heading"><span className="metric-icon"><ArrowDownLeft aria-hidden="true" /></span><span>Money in</span></div>
          <strong>{formatMoney(safeSummary.totalIncome, currency)}</strong>
          <small>Recorded income</small>
        </article>
        <article className="metric-card metric-expense">
          <div className="metric-heading"><span className="metric-icon"><ArrowUpRight aria-hidden="true" /></span><span>Money out</span></div>
          <strong>{formatMoney(safeSummary.totalExpenses, currency)}</strong>
          <small>Recorded spending</small>
        </article>
        <article className="metric-card metric-savings">
          <div className="metric-heading"><span className="metric-icon"><PiggyBank aria-hidden="true" /></span><span>Saved</span></div>
          <strong>{formatMoney(safeSummary.netSavings, currency)}</strong>
          <small>Net savings this month</small>
        </article>
      </section>

      {(safeSummary.isExceeded || safeSummary.isWarn90 || safeSummary.isWarn75) && (
        <div className={`budget-alert${safeSummary.isExceeded ? ' is-over' : ''}`} role="status">
          <AlertTriangle aria-hidden="true" />
          <span>
            {safeSummary.isExceeded
              ? 'You’ve passed this month’s budget. Review the category breakdown to see where it moved.'
              : `You’ve used ${Math.round(budgetUse)}% of this month’s budget.`}
          </span>
          <button type="button" onClick={() => setActiveTab('budget')}>Open budget</button>
        </div>
      )}

      <div className="dashboard-chart-grid">
        <section className="ledger-panel cashflow-chart-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">DAY BY DAY</p>
              <h2>Cash flow</h2>
            </div>
            <div className="chart-legend" aria-label="Chart legend">
              <span><i className="legend-income" />Income</span>
              <span><i className="legend-expense" />Expenses</span>
            </div>
          </div>
          <p className="panel-description">Daily movement during {formattedMonth}</p>
          <div className="cashflow-chart">
            {chartHasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeSummary.dailySpending} margin={{ top: 10, right: 4, left: -18, bottom: 0 }} barGap={3}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 11 }} tickMargin={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-label)', fontSize: 10 }} tickFormatter={(value) => `${value > 999 ? `${(value / 1000).toFixed(0)}k` : value}`} />
                  <Tooltip
                    formatter={(value: any) => formatMoney(Number(value) || 0, currency)}
                    labelFormatter={(label) => `Day ${label}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--panel-border)', background: 'var(--surface)', color: 'var(--ink)', boxShadow: '0 12px 28px rgba(20,35,29,.12)' }}
                  />
                  <Bar dataKey="income" name="Income" fill="#2f8c67" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="expense" name="Expenses" fill="#d58a66" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">
                <span className="empty-ledger-mark"><Receipt aria-hidden="true" /></span>
                <strong>No movement recorded yet</strong>
                <span>Add a transaction to see your daily pattern.</span>
                <button type="button" className="text-action" onClick={() => onOpenAddModal('expense')}>Add the first entry <ChevronRight aria-hidden="true" /></button>
              </div>
            )}
          </div>
        </section>

        <section className="ledger-panel category-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">SPENDING MIX</p>
              <h2>Where it went</h2>
            </div>
            <span className="category-count">{categoryCount} categories</span>
          </div>
          <p className="panel-description">Largest expense categories this month</p>
          {categoryRows.length ? (
            <div className="category-list">
              {categoryRows.map((item) => (
                <div className="category-row" key={item.categoryId}>
                  <div className="category-row-top">
                    <span className="category-name">
                      <span className="category-mark" style={{ backgroundColor: `${item.color || '#638072'}20` }}>
                        <CategoryIcon iconName={item.icon || 'CircleHelp'} className="w-4 h-4" color={item.color || '#638072'} />
                      </span>
                      <span>{item.categoryName}</span>
                    </span>
                    <strong>{formatMoney(item.spent, currency)}</strong>
                  </div>
                  <div className="category-progress"><span style={{ width: `${Math.max(4, (item.spent / categoryMaximum) * 100)}%`, backgroundColor: item.color || '#638072' }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="category-empty">Category totals will appear once expenses are recorded.</div>
          )}
          <button type="button" className="panel-link" onClick={() => setActiveTab('reports')}>Explore reports <ChevronRight aria-hidden="true" /></button>
        </section>
      </div>

      <div className="dashboard-lower-grid">
        <section className="ledger-panel activity-panel">
          <div className="panel-heading activity-heading">
            <div>
              <p className="section-kicker">LATEST ENTRIES</p>
              <h2>Recent activity</h2>
            </div>
            <button type="button" className="panel-link" onClick={() => setActiveTab('transactions')}>All transactions <ChevronRight aria-hidden="true" /></button>
          </div>
          {safeTransactions.length > 0 ? (
            <div className="recent-list">
              {safeTransactions.slice(0, 5).map((transaction) => {
                const category = safeCategories.find((item) => item?.id === transaction.categoryId);
                const isIncome = transaction.type === 'income';
                const isOutflow = transaction.type === 'expense' || transaction.type === 'loan_repayment';
                const sign = isIncome ? '+' : isOutflow ? '−' : '';
                const txDate = new Date(`${transaction.date}T00:00:00`);
                return (
                  <div className="recent-entry-shell" key={transaction.id}>
                    <button
                      type="button"
                      id={`recent-tx-${transaction.id}`}
                      className="recent-row"
                      onClick={() => onSelectTransaction(transaction)}
                      aria-label={`Edit ${transaction.description}, ${formatMoney(transaction.amount, currency)}`}
                    >
                      <span className="recent-category-icon" style={{ backgroundColor: `${category?.color || '#638072'}18` }}>
                        <CategoryIcon iconName={category?.icon || 'CircleHelp'} className="w-4 h-4" color={category?.color || '#638072'} />
                      </span>
                      <span className="recent-description">
                        <strong>{transaction.description || category?.name || 'Transaction'}</strong>
                        <small>{category?.name || 'General'} <span aria-hidden="true">·</span> {Number.isNaN(txDate.getTime()) ? transaction.date : txDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</small>
                      </span>
                      <span className={`recent-amount${isIncome ? ' is-income' : isOutflow ? ' is-outflow' : ''}`}>
                        <strong>{sign}{formatMoney(transaction.amount, currency)}</strong>
                        <small>{transaction.type.replace('_', ' ')}</small>
                      </span>
                    </button>
                    {transaction.receiptUrl && (
                      <button
                        type="button"
                        className="recent-receipt-action"
                        onClick={() => setPreviewReceiptTx(transaction)}
                        aria-label={`Preview receipt for ${transaction.description || 'transaction'}`}
                        title="Preview receipt and download PNG"
                      >
                        <Receipt aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="activity-empty">
              <span>No entries yet for {formattedMonth}.</span>
              <button type="button" className="text-action" onClick={() => onOpenAddModal('expense')}><Plus aria-hidden="true" />Record an expense</button>
            </div>
          )}
        </section>

        <section className="ledger-panel obligations-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">OUTSTANDING</p>
              <h2>Money in motion</h2>
            </div>
            <ArrowLeftRight className="panel-heading-icon" aria-hidden="true" />
          </div>
          <button type="button" className="obligation-row" onClick={() => setActiveTab('credit_debit')}>
            <span className="obligation-icon obligation-payable"><ArrowUpRight aria-hidden="true" /></span>
            <span className="obligation-label"><strong>To pay</strong><small>Credit balance</small></span>
            <strong className="obligation-amount">{formatMoney(safeSummary.totalCredit, currency)}</strong>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" className="obligation-row" onClick={() => setActiveTab('credit_debit')}>
            <span className="obligation-icon obligation-receivable"><ArrowDownLeft aria-hidden="true" /></span>
            <span className="obligation-label"><strong>To receive</strong><small>Debit balance</small></span>
            <strong className="obligation-amount">{formatMoney(safeSummary.totalDebit, currency)}</strong>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" className="obligation-row" onClick={() => setActiveTab('loans')}>
            <span className="obligation-icon obligation-loan"><Landmark aria-hidden="true" /></span>
            <span className="obligation-label"><strong>Loan balance</strong><small>Active principal</small></span>
            <strong className="obligation-amount">{formatMoney(safeSummary.outstandingLoans, currency)}</strong>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" className="panel-link obligation-link" onClick={() => setActiveTab('calendar')}><CalendarDays aria-hidden="true" />View upcoming dates <ChevronRight aria-hidden="true" /></button>
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        {safeInsights.length > 0 && (
          <section className="ledger-panel insights-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">PATTERNS TO NOTICE</p>
                <h2>Personal insights</h2>
              </div>
              <TrendingUp className="panel-heading-icon" aria-hidden="true" />
            </div>
            <div className="insight-list">
              {safeInsights.slice(0, 3).map((insight) => (
                <article className={`insight-item insight-${insight.type}`} key={insight.id}>
                  <span className="insight-dot" aria-hidden="true" />
                  <div><strong>{insight.title}</strong><p>{insight.message}</p></div>
                </article>
              ))}
            </div>
          </section>
        )}

        {previousSummary && (
          <section className="ledger-panel comparison-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">MONTH TO MONTH</p>
                <h2>Progress, not noise</h2>
              </div>
              <FileBarChart2 className="panel-heading-icon" aria-hidden="true" />
            </div>
            <div className="comparison-row">
              <span>Spending</span>
              <strong className={safeSummary.totalExpenses <= previousSummary.totalExpenses ? 'comparison-good' : 'comparison-watch'}>
                {safeSummary.totalExpenses <= previousSummary.totalExpenses ? '↓ ' : '↑ '}{formatMoney(Math.abs(safeSummary.totalExpenses - previousSummary.totalExpenses), currency)}
              </strong>
            </div>
            <div className="comparison-row">
              <span>Income</span>
              <strong className={safeSummary.totalIncome >= previousSummary.totalIncome ? 'comparison-good' : 'comparison-watch'}>
                {safeSummary.totalIncome >= previousSummary.totalIncome ? '↑ ' : '↓ '}{formatMoney(Math.abs(safeSummary.totalIncome - previousSummary.totalIncome), currency)}
              </strong>
            </div>
            <p className="comparison-caption">Change compared with {previousLabel}</p>
          </section>
        )}
      </div>
      {previewReceiptTx && (
        <ReceiptModal
          isOpen={Boolean(previewReceiptTx)}
          onClose={() => setPreviewReceiptTx(null)}
          imageUrl={previewReceiptTx.receiptUrl || null}
          title={previewReceiptTx.description}
          merchant={previewReceiptTx.merchant}
          amount={formatMoney(previewReceiptTx.amount, currency)}
          date={previewReceiptTx.date}
        />
      )}
    </div>
  );
};
