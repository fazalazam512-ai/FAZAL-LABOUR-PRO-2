import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Edit2,
  Receipt,
  Plus,
  X,
  Clock,
  Calendar,
  CreditCard,
  Building,
  CheckCircle,
  Maximize2,
} from 'lucide-react';
import {
  Transaction,
  Category,
  CurrencyCode,
  TransactionType,
  PaymentMethod,
} from '../types';
import { formatMoney } from '../constants/currencies';
import { CategoryIcon } from './CategoryIcon';
import { ReceiptModal } from './ReceiptModal';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenAddModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  currency,
  onEditTransaction,
  onDeleteTransaction,
  onOpenAddModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Filter & Search Logic
  const filteredTransactions = useMemo(() => {
    return safeTransactions.filter((tx) => {
      if (!tx) return false;
      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }
      // Category filter
      if (selectedCategoryId !== 'all' && tx.categoryId !== selectedCategoryId) {
        return false;
      }
      // Payment method filter
      if (selectedPaymentMethod !== 'all' && tx.paymentMethod !== selectedPaymentMethod) {
        return false;
      }
      // Search query filter (matches description, merchant, notes, amount)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cat = safeCategories.find((c) => c && c.id === tx.categoryId);
        const matchesDesc = (tx.description || '').toLowerCase().includes(query);
        const matchesMerchant = (tx.merchant || '').toLowerCase().includes(query);
        const matchesCategory = (cat?.name || '').toLowerCase().includes(query);
        const matchesNotes = (tx.notes || '').toLowerCase().includes(query);
        const matchesAmount = (tx.amount ?? '').toString().includes(query);

        if (!matchesDesc && !matchesMerchant && !matchesCategory && !matchesNotes && !matchesAmount) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'date_desc') {
        return new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      }
      if (sortOrder === 'date_asc') {
        return new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      }
      if (sortOrder === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (sortOrder === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [transactions, searchQuery, selectedType, selectedCategoryId, selectedPaymentMethod, sortOrder, categories]);

  // Group transactions by date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filteredTransactions) {
      const list = map.get(tx.date) || [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return map;
  }, [filteredTransactions]);

  // Format date display label (Today, Yesterday, or Full Date)
  const formatDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';

    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div id="transactions-view" className="space-y-5 pb-12">
      {/* Header & New Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transaction History</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Search, filter, and audit all recorded inflows and outflows
          </p>
        </div>
        <button
          id="transactions-add-btn"
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="transactions-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by description, merchant, notes, amount..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Type filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Type
            </label>
            <select
              id="filter-type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="loan_repayment">Loan Repayment</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Category
            </label>
            <select
              id="filter-category-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Method
            </label>
            <select
              id="filter-payment-method-select"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Sort By
            </label>
            <select
              id="filter-sort-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full py-1.5 px-2.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Records Grouped by Date */}
      {groupedByDate.size > 0 ? (
        <div className="space-y-4">
          {Array.from(groupedByDate.entries()).map(([dateStr, txList]) => {
            const dateTotal = txList.reduce((acc, t) => {
              if (t.type === 'income') return acc + t.amount;
              if (t.type === 'expense' || t.type === 'loan_repayment') return acc - t.amount;
              return acc;
            }, 0);

            return (
              <div
                key={dateStr}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                {/* Date group header */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatDateLabel(dateStr)}
                    </span>
                    <span className="text-[10px] text-slate-400">({txList.length} items)</span>
                  </div>
                  <div className="font-semibold">
                    <span className="text-[10px] text-slate-400 mr-1.5">Net:</span>
                    <span className={dateTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {dateTotal >= 0 ? '+' : ''}{formatMoney(dateTotal, currency)}
                    </span>
                  </div>
                </div>

                {/* List of transactions for this day */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {txList.map((tx) => {
                    const cat = categories.find((c) => c.id === tx.categoryId);
                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense' || tx.type === 'loan_repayment';

                    return (
                      <div
                        key={tx.id}
                        id={`tx-row-${tx.id}`}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0"
                            style={{ backgroundColor: `${cat?.color || '#64748b'}20` }}
                          >
                            <CategoryIcon
                              iconName={cat?.icon || 'HelpCircle'}
                              className="w-5 h-5"
                              color={cat?.color || '#64748b'}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {tx.description}
                              </span>
                              {tx.subcategoryId && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {tx.subcategoryId}
                                </span>
                              )}
                              {tx.receiptUrl && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div
                                    className="relative group cursor-pointer"
                                    onClick={() => setSelectedReceiptTx(tx)}
                                    title="Click to view full receipt & download PNG"
                                  >
                                    <img
                                      src={tx.receiptUrl}
                                      alt="Receipt"
                                      className="w-7 h-7 object-cover rounded-md border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-110 transition-transform"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 rounded-md transition-opacity flex items-center justify-center text-white">
                                      <Maximize2 className="w-3 h-3 text-emerald-400" />
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptTx(tx)}
                                    className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                                    title="View full receipt, zoom & download PNG"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Receipt</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                              <span>{cat?.name}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {tx.time || '12:00'}
                              </span>
                              <span>•</span>
                              <span>{tx.paymentMethod}</span>
                              {tx.merchant && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                                    {tx.merchant}
                                  </span>
                                </>
                              )}
                            </div>

                            {tx.notes && (
                              <p className="text-[11px] text-slate-400 italic mt-1">
                                Note: {tx.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="text-left sm:text-right">
                            <span
                              className={`text-sm font-extrabold ${
                                isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isExpense
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-indigo-600 dark:text-indigo-400'
                              }`}
                            >
                              {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency)}
                            </span>
                            <div className="text-[10px] uppercase font-bold text-slate-400">
                              {tx.type.replace('_', ' ')}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              id={`edit-tx-${tx.id}`}
                              onClick={() => onEditTransaction(tx)}
                              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Transaction"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-tx-${tx.id}`}
                              onClick={() => setTransactionToDelete(tx)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            {searchQuery || selectedType !== 'all' || selectedCategoryId !== 'all'
              ? 'No transactions found matching your filter criteria.'
              : 'No transactions recorded yet.'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      )}

      {/* High-Resolution Zoom, Pan & PNG Download Modal */}
      {selectedReceiptTx && (
        <ReceiptModal
          isOpen={Boolean(selectedReceiptTx)}
          onClose={() => setSelectedReceiptTx(null)}
          imageUrl={selectedReceiptTx.receiptUrl || null}
          title={selectedReceiptTx.description}
          merchant={selectedReceiptTx.merchant}
          amount={formatMoney(selectedReceiptTx.amount, currency)}
          date={selectedReceiptTx.date}
        />
      )}

      {/* Delete Confirmation Modal (PRD Section 32: Ask for confirmation before deleting) */}
      {transactionToDelete && (
        <div
          id="delete-confirmation-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setTransactionToDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Transaction?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete &quot;{transactionToDelete.description}&quot; ({formatMoney(transactionToDelete.amount, currency)})? This will recalculate all budgets and balances.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setTransactionToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-tx-btn"
                onClick={() => {
                  onDeleteTransaction(transactionToDelete.id);
                  setTransactionToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
