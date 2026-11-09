import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  X,
  CreditCard,
} from 'lucide-react';
import { CreditDebitRecord, CreditDebitType, CurrencyCode } from '../types';
import { formatMoney } from '../constants/currencies';

interface CreditDebitViewProps {
  records: CreditDebitRecord[];
  currency: CurrencyCode;
  onAddRecord: (record: Omit<CreditDebitRecord, 'id' | 'paidAmount' | 'remainingAmount' | 'status' | 'createdAt'>) => void;
  onRecordPayment: (id: string, paymentAmount: number) => void;
  onDeleteRecord: (id: string) => void;
}

export const CreditDebitView: React.FC<CreditDebitViewProps> = ({
  records,
  currency,
  onAddRecord,
  onRecordPayment,
  onDeleteRecord,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<CreditDebitRecord | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for new record
  const [type, setType] = useState<CreditDebitType>('credit');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Summaries
  const safeRecords = Array.isArray(records) ? records : [];
  const totalCredit = safeRecords
    .filter((r) => r && r.type === 'credit')
    .reduce((sum, r) => sum + (Number(r?.remainingAmount) || 0), 0);

  const totalDebit = safeRecords
    .filter((r) => r && r.type === 'debit')
    .reduce((sum, r) => sum + (Number(r?.remainingAmount) || 0), 0);

  const filteredRecords = safeRecords.filter((r) => {
    if (!r) return false;
    if (activeFilter === 'credit') return r.type === 'credit';
    if (activeFilter === 'debit') return r.type === 'debit';
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!person.trim()) {
      setErrorMsg('Please specify person or company.');
      return;
    }
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Please enter a due date.');
      return;
    }

    onAddRecord({
      type,
      person: person.trim(),
      amount: num,
      dueDate,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setShowAddModal(false);
    setPerson('');
    setAmount('');
    setDueDate('');
    setDescription('');
    setNotes('');
    setErrorMsg('');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPayment) return;

    const payNum = parseFloat(paymentAmountInput);
    if (isNaN(payNum) || payNum <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }
    if (payNum > selectedRecordForPayment.remainingAmount) {
      setErrorMsg(`Payment cannot exceed outstanding balance (${formatMoney(selectedRecordForPayment.remainingAmount, currency)}).`);
      return;
    }

    onRecordPayment(selectedRecordForPayment.id, payNum);
    setSelectedRecordForPayment(null);
    setPaymentAmountInput('');
    setErrorMsg('');
  };

  return (
    <div id="credit-debit-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Credit & Debit Tracker</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Keep clear track of payables (money you owe) and receivables (money owed to you)
          </p>
        </div>
        <button
          id="add-credit-debit-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Credit/Debit</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Credit (Payable) */}
        <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Outstanding Credit (We Owe)
            </span>
            <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">
              {formatMoney(totalCredit, currency)}
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400/80 mt-0.5">
              Borrowed funds / liabilities to settle
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Total Debit (Receivable) */}
        <div className="p-5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide">
              Outstanding Debit (To Receive)
            </span>
            <div className="text-2xl font-extrabold text-cyan-900 dark:text-cyan-200 mt-1">
              {formatMoney(totalDebit, currency)}
            </div>
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400/80 mt-0.5">
              Advances lent / receivables due to you
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-300 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'all'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All Records
        </button>
        <button
          onClick={() => setActiveFilter('credit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'credit'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Credit (We Owe)
        </button>
        <button
          onClick={() => setActiveFilter('debit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'debit'
              ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Debit (To Receive)
        </button>
      </div>

      {/* Records List */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((rec) => {
            const isCredit = rec.type === 'credit';
            const isOverdue = rec.status === 'overdue';
            const isPaid = rec.status === 'paid';

            return (
              <div
                key={rec.id}
                id={`cd-card-${rec.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                            : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400'
                        }`}
                      >
                        <ArrowLeftRight className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {rec.person}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {rec.status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isCredit ? 'Credit (We owe)' : 'Debit (Lent out)'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteRecord(rec.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {rec.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">
                      {rec.description}
                    </p>
                  )}

                  {rec.notes && (
                    <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-lg">
                      Note: {rec.notes}
                    </p>
                  )}

                  {/* Amounts & Due date */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Remaining</span>
                      <span
                        className={`text-base font-extrabold ${
                          isCredit ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'
                        }`}
                      >
                        {formatMoney(rec.remainingAmount, currency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Total Original</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(rec.amount, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Due: {rec.dueDate}</span>
                  </div>
                </div>

                {/* Settle / Payment button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  {!isPaid ? (
                    <button
                      id={`pay-cd-${rec.id}`}
                      onClick={() => {
                        setSelectedRecordForPayment(rec);
                        setPaymentAmountInput(rec.remainingAmount.toString());
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      Record Payment / Settle
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Fully Settled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <ArrowLeftRight className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            No credit or debit entries recorded.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
          >
            + Add First Entry
          </button>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div
          id="add-cd-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                New Credit / Debit Entry
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs">{errorMsg}</div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  TYPE
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('credit')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      type === 'credit'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700'
                    }`}
                  >
                    Credit (Money We Owe)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('debit')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      type === 'debit'
                        ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700'
                    }`}
                  >
                    Debit (Money Owed to Us)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  PERSON / ENTITY NAME
                </label>
                <input
                  type="text"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  placeholder="e.g. Hamza Tariq, XYZ Store"
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    AMOUNT ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="15000"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    DUE DATE
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  PURPOSE / DESCRIPTION
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Shared gadget purchase"
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-create-cd-btn"
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment / Settle Modal */}
      {selectedRecordForPayment && (
        <div
          id="cd-payment-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedRecordForPayment(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedRecordForPayment.person} • Outstanding:{' '}
                {formatMoney(selectedRecordForPayment.remainingAmount, currency)}
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs">{errorMsg}</div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  PAYMENT AMOUNT ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  placeholder={selectedRecordForPayment.remainingAmount.toString()}
                  className="w-full py-2.5 px-3 rounded-xl text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForPayment(null)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-record-cd-payment-btn"
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
