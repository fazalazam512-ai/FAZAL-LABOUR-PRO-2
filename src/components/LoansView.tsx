import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  History,
  Trash2,
  Calendar,
  X,
  CreditCard,
  Percent,
} from 'lucide-react';
import { Loan, CurrencyCode } from '../types';
import { formatMoney } from '../constants/currencies';

interface LoansViewProps {
  loans: Loan[];
  currency: CurrencyCode;
  onAddLoan: (loan: Omit<Loan, 'id' | 'paidAmount' | 'remainingAmount' | 'status' | 'repayments'>) => void;
  onRecordRepayment: (loanId: string, amount: number, notes?: string) => void;
  onDeleteLoan: (loanId: string) => void;
}

export const LoansView: React.FC<LoansViewProps> = ({
  loans,
  currency,
  onAddLoan,
  onRecordRepayment,
  onDeleteLoan,
}) => {
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [activeLoanForRepay, setActiveLoanForRepay] = useState<Loan | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentNotes, setRepaymentNotes] = useState('');
  const [viewHistoryLoan, setViewHistoryLoan] = useState<Loan | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // New Loan Form States
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [type, setType] = useState<'borrowed' | 'lent'>('borrowed');
  const [principal, setPrincipal] = useState('');
  const [installment, setInstallment] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'one_time'>('monthly');
  const [notes, setNotes] = useState('');

  // Overview metrics
  const safeLoans = Array.isArray(loans) ? loans : [];
  const totalPrincipal = safeLoans.reduce((sum, l) => sum + (Number(l?.principalAmount) || 0), 0);
  const totalPaid = safeLoans.reduce((sum, l) => sum + (Number(l?.paidAmount) || 0), 0);
  const totalRemaining = safeLoans.reduce((sum, l) => sum + (Number(l?.remainingAmount) || 0), 0);
  const overallProgress = totalPrincipal > 0 ? Math.round((totalPaid / totalPrincipal) * 100) : 0;

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const principalNum = parseFloat(principal);
    const installmentNum = installment ? parseFloat(installment) : undefined;
    const interestNum = interestRate ? parseFloat(interestRate) : undefined;

    if (!name.trim()) {
      setErrorMsg('Please enter a loan title.');
      return;
    }
    if (!lender.trim()) {
      setErrorMsg('Please specify the lender or borrower name.');
      return;
    }
    if (isNaN(principalNum) || principalNum <= 0) {
      setErrorMsg('Please enter a valid principal amount.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Please specify a maturity/due date.');
      return;
    }

    onAddLoan({
      name: name.trim(),
      lender: lender.trim(),
      type,
      principalAmount: principalNum,
      interestRate: interestNum,
      installmentAmount: installmentNum,
      frequency,
      startDate,
      dueDate,
      notes: notes.trim() || undefined,
    });

    setShowAddLoanModal(false);
    setName('');
    setLender('');
    setPrincipal('');
    setInstallment('');
    setInterestRate('');
    setDueDate('');
    setNotes('');
    setErrorMsg('');
  };

  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoanForRepay) return;

    const amount = parseFloat(repaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid repayment amount.');
      return;
    }

    if (amount > activeLoanForRepay.remainingAmount) {
      setErrorMsg(`Repayment cannot exceed remaining loan balance (${formatMoney(activeLoanForRepay.remainingAmount, currency)}).`);
      return;
    }

    onRecordRepayment(activeLoanForRepay.id, amount, repaymentNotes.trim() || undefined);
    setActiveLoanForRepay(null);
    setRepaymentAmount('');
    setRepaymentNotes('');
    setErrorMsg('');
  };

  return (
    <div id="loans-view" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Loan Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track bank financing, family borrowings, installment schedules, and repayment history
          </p>
        </div>
        <button
          id="add-loan-btn"
          onClick={() => setShowAddLoanModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Loan</span>
        </button>
      </div>

      {/* Aggregate Overview Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950 to-slate-900 text-white shadow-md space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-300 font-semibold">
              Total Outstanding Balance
            </span>
            <div className="text-3xl font-extrabold mt-1 text-purple-200">
              {formatMoney(totalRemaining, currency)}
            </div>
            <p className="text-[11px] text-purple-300/80 mt-0.5">
              Active principal liabilities
            </p>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-purple-300 font-semibold">
              Total Paid Off
            </span>
            <div className="text-2xl font-bold mt-1 text-emerald-300">
              {formatMoney(totalPaid, currency)}
            </div>
            <p className="text-[11px] text-purple-300/80 mt-0.5">
              Cumulative repayments settled
            </p>
          </div>

          <div>
            <span className="text-xs uppercase tracking-wider text-purple-300 font-semibold">
              Original Principal
            </span>
            <div className="text-2xl font-bold mt-1 text-slate-300">
              {formatMoney(totalPrincipal, currency)}
            </div>
            <p className="text-[11px] text-purple-300/80 mt-0.5">
              {overallProgress}% paid off overall
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-3 rounded-full bg-purple-900/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Loans Grid */}
      {safeLoans.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {safeLoans.map((loan) => {
            const progress = loan.principalAmount > 0 ? Math.min(100, Math.round((loan.paidAmount / loan.principalAmount) * 100)) : 0;
            const isPaid = loan.status === 'paid' || loan.remainingAmount === 0;

            return (
              <div
                key={loan.id}
                id={`loan-card-${loan.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {loan.name}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            }`}
                          >
                            {isPaid ? 'Fully Paid' : 'Active'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {loan.type === 'borrowed' ? 'Lender' : 'Borrower'}: <strong>{loan.lender}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteLoan(loan.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                      title="Delete Loan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {loan.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-3 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      {loan.notes}
                    </p>
                  )}

                  {/* Visual Progress Bar (PRD: Original: PKR 500k, Paid: PKR 150k, Remaining: PKR 350k) */}
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Original Loan</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatMoney(loan.principalAmount, currency)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Paid</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(loan.paidAmount, currency)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Remaining</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {formatMoney(loan.remainingAmount, currency)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isPaid ? 'bg-emerald-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{progress}% Repaid</span>
                      {loan.installmentAmount && (
                        <span>
                          Installment: {formatMoney(loan.installmentAmount, currency)} ({loan.frequency || 'monthly'})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Due: {loan.dueDate}
                    </span>
                    {loan.interestRate ? (
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Interest: {loan.interestRate}%
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Actions & Repayment Logs */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setViewHistoryLoan(loan)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Repayment History ({loan.repayments?.length || 0})</span>
                  </button>

                  {!isPaid && (
                    <button
                      id={`repay-btn-${loan.id}`}
                      onClick={() => {
                        setActiveLoanForRepay(loan);
                        setRepaymentAmount(loan.installmentAmount ? loan.installmentAmount.toString() : '');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      Record Repayment
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Landmark className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            No active loans or financing facilities tracked.
          </p>
          <button
            onClick={() => setShowAddLoanModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
          >
            + Add First Loan
          </button>
        </div>
      )}

      {/* Add Loan Modal */}
      {showAddLoanModal && (
        <div
          id="add-loan-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowAddLoanModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Loan / Financing Facility
              </h3>
              <button onClick={() => setShowAddLoanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs">{errorMsg}</div>
            )}

            <form onSubmit={handleCreateLoan} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  LOAN NAME / TITLE
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Car Auto Finance, Home Renovation"
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    LENDER / BORROWER
                  </label>
                  <input
                    type="text"
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    placeholder="e.g. Meezan Bank, Uncle Salman"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    TYPE
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="borrowed">Borrowed (Liability)</option>
                    <option value="lent">Lent (Asset)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    PRINCIPAL AMOUNT ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="500000"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    INSTALLMENT AMOUNT (OPTIONAL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={installment}
                    onChange={(e) => setInstallment(e.target.value)}
                    placeholder="25000"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    DUE / MATURITY DATE
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    INTEREST % (OPTIONAL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="0"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  NOTES
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms, bank account reference..."
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLoanModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-create-loan-btn"
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                >
                  Save Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      {activeLoanForRepay && (
        <div
          id="repayment-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveLoanForRepay(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Loan Repayment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeLoanForRepay.name} • Remaining balance:{' '}
                {formatMoney(activeLoanForRepay.remainingAmount, currency)}
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs">{errorMsg}</div>
            )}

            <form onSubmit={handleRepaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  REPAYMENT AMOUNT ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full py-2.5 px-3 rounded-xl text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  NOTE / REFERENCE
                </label>
                <input
                  type="text"
                  value={repaymentNotes}
                  onChange={(e) => setRepaymentNotes(e.target.value)}
                  placeholder="e.g. Monthly installment debited"
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveLoanForRepay(null)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-repayment-btn"
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repayments History Lightbox */}
      {viewHistoryLoan && (
        <div
          id="loan-history-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewHistoryLoan(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {viewHistoryLoan.name}
                </h3>
                <span className="text-xs text-slate-500">Repayment Installment Logs</span>
              </div>
              <button
                onClick={() => setViewHistoryLoan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {viewHistoryLoan.repayments && viewHistoryLoan.repayments.length > 0 ? (
                viewHistoryLoan.repayments.map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {r.notes || 'Installment Repayment'}
                      </span>
                      <span className="text-[10px] text-slate-400">{r.date}</span>
                    </div>
                    <span className="font-bold text-emerald-600">
                      +{formatMoney(r.amount, currency)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No repayment history recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
