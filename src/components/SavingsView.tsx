import React, { useState } from 'react';
import {
  PiggyBank,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { SavingsGoal, CurrencyCode } from '../types';
import { formatMoney } from '../constants/currencies';

interface SavingsViewProps {
  savingsGoals: SavingsGoal[];
  currency: CurrencyCode;
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'history' | 'createdAt'>) => void;
  onRecordActivity: (goalId: string, amount: number, type: 'deposit' | 'withdraw', notes?: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  savingsGoals,
  currency,
  onAddGoal,
  onRecordActivity,
  onDeleteGoal,
}) => {
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [activeGoalForActivity, setActiveGoalForActivity] = useState<SavingsGoal | null>(null);
  const [activityType, setActivityType] = useState<'deposit' | 'withdraw'>('deposit');
  const [activityAmount, setActivityAmount] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [viewHistoryGoal, setViewHistoryGoal] = useState<SavingsGoal | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // New Goal form states
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [newGoalNotes, setNewGoalNotes] = useState('');

  // Calculations across all goals
  const safeGoals = Array.isArray(savingsGoals) ? savingsGoals : [];
  const totalTarget = safeGoals.reduce((sum, g) => sum + (Number(g?.targetAmount) || 0), 0);
  const totalSaved = safeGoals.reduce((sum, g) => sum + (Number(g?.currentAmount) || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newGoalTarget);
    const current = parseFloat(newGoalCurrent) || 0;

    if (!newGoalName.trim()) {
      setErrorMsg('Please enter a goal name.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setErrorMsg('Please enter a valid target amount.');
      return;
    }

    onAddGoal({
      name: newGoalName.trim(),
      targetAmount: target,
      currentAmount: current,
      targetDate: newGoalDate || undefined,
      notes: newGoalNotes.trim() || undefined,
    });

    setShowAddGoalModal(false);
    setNewGoalName('');
    setNewGoalTarget('');
    setNewGoalCurrent('');
    setNewGoalDate('');
    setNewGoalNotes('');
    setErrorMsg('');
  };

  const handleRecordActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalForActivity) return;

    const amount = parseFloat(activityAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }

    if (activityType === 'withdraw' && amount > activeGoalForActivity.currentAmount) {
      setErrorMsg(`Cannot withdraw more than current savings (${formatMoney(activeGoalForActivity.currentAmount, currency)}).`);
      return;
    }

    onRecordActivity(activeGoalForActivity.id, amount, activityType, activityNotes.trim() || undefined);
    setActiveGoalForActivity(null);
    setActivityAmount('');
    setActivityNotes('');
    setErrorMsg('');
  };

  return (
    <div id="savings-view" className="space-y-6 pb-12">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Savings Goals</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set strategic financial targets, make deposits, and monitor milestone progress
          </p>
        </div>
        <button
          id="add-savings-goal-btn"
          onClick={() => setShowAddGoalModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Overview Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">
              Total Accumulated Savings
            </span>
            <div className="text-3xl font-extrabold mt-1">
              {formatMoney(totalSaved, currency)}
            </div>
            <p className="text-xs text-indigo-300 mt-0.5">
              Across {safeGoals.length} active financial targets
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">
              Combined Target
            </span>
            <div className="text-xl font-bold mt-1 text-slate-200">
              {formatMoney(totalTarget, currency)}
            </div>
            <span className="text-xs text-indigo-300 font-medium">
              {overallProgress}% of milestone reached
            </span>
          </div>
        </div>

        {/* Aggregate Progress Bar */}
        <div className="w-full h-3 rounded-full bg-indigo-950 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.min(100, overallProgress)}%` }}
          />
        </div>
      </div>

      {/* Goals Grid */}
      {safeGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeGoals.map((goal) => {
            const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            return (
              <div
                key={goal.id}
                id={`savings-card-${goal.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {goal.name}
                        </h3>
                        {goal.targetDate && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> Target: {goal.targetDate}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-3 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      {goal.notes}
                    </p>
                  )}

                  {/* Amounts */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Saved</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {formatMoney(goal.currentAmount, currency)}
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>{progress}% Reached</span>
                      <span>Target: {formatMoney(goal.targetAmount, currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions & History */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setViewHistoryGoal(goal)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Logs</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`deposit-btn-${goal.id}`}
                      onClick={() => {
                        setActiveGoalForActivity(goal);
                        setActivityType('deposit');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      <span>Deposit</span>
                    </button>
                    <button
                      id={`withdraw-btn-${goal.id}`}
                      onClick={() => {
                        setActiveGoalForActivity(goal);
                        setActivityType('withdraw');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <PiggyBank className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            No savings goals established yet. Create one to begin tracking progress!
          </p>
          <button
            onClick={() => setShowAddGoalModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
          >
            + Create First Goal
          </button>
        </div>
      )}

      {/* Add New Goal Modal */}
      {showAddGoalModal && (
        <div
          id="add-goal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddGoalModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Savings Goal
              </h3>
              <button
                onClick={() => setShowAddGoalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  GOAL NAME
                </label>
                <input
                  type="text"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="e.g. New Laptop, Emergency Fund, Umrah Trip"
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    TARGET AMOUNT ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    placeholder="150000"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    INITIAL SAVED ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newGoalCurrent}
                    onChange={(e) => setNewGoalCurrent(e.target.value)}
                    placeholder="0"
                    className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  TARGET DATE (OPTIONAL)
                </label>
                <input
                  type="date"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  NOTES
                </label>
                <input
                  type="text"
                  value={newGoalNotes}
                  onChange={(e) => setNewGoalNotes(e.target.value)}
                  placeholder="Purpose or target account details..."
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-create-goal-btn"
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Deposit / Withdraw Activity Modal */}
      {activeGoalForActivity && (
        <div
          id="savings-activity-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveGoalForActivity(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {activityType === 'deposit' ? 'Add Deposit to Goal' : 'Withdraw Funds from Goal'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeGoalForActivity.name} • Current balance:{' '}
                {formatMoney(activeGoalForActivity.currentAmount, currency)}
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRecordActivitySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  AMOUNT ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={activityAmount}
                  onChange={(e) => setActivityAmount(e.target.value)}
                  placeholder="e.g. 5000"
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
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  placeholder="e.g. September bonus allocation"
                  className="w-full py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveGoalForActivity(null)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-savings-activity-btn"
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl text-white ${
                    activityType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Confirm {activityType === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal History Lightbox */}
      {viewHistoryGoal && (
        <div
          id="savings-history-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewHistoryGoal(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {viewHistoryGoal.name}
                </h3>
                <span className="text-xs text-slate-500">Savings Contribution History</span>
              </div>
              <button
                onClick={() => setViewHistoryGoal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {viewHistoryGoal.history?.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {item.notes || (item.type === 'deposit' ? 'Deposit' : 'Withdrawal')}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.date}</span>
                  </div>
                  <span
                    className={`font-bold ${
                      item.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {item.type === 'deposit' ? '+' : '-'}{formatMoney(item.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
