import assert from 'node:assert/strict';
import test from 'node:test';
import type { Category, UserProfile } from '../src/types';
import {
  diffRecords,
  mergeLocalData,
  mergeRemoteAndLocalData,
  sortTransactionsNewestFirst,
  toFirestoreDocumentId,
} from '../src/services/firestoreDataModel';

const profile: UserProfile = {
  name: 'Local User',
  defaultCurrency: 'PKR',
  theme: 'light',
  defaultMonthlyBudget: 0,
  onboarded: false,
  alert75: true,
  alert90: true,
  alert100: true,
};

const category = (id: string, name: string): Category => ({
  id,
  name,
  icon: 'Tag',
  color: '#10b981',
  type: 'expense',
  isDefault: false,
});

test('local migration prefers UID-scoped records over matching unscoped legacy IDs', () => {
  const result = mergeLocalData(
    { transactions: [{ id: 'same', amount: 20 } as never] },
    { transactions: [{ id: 'same', amount: 10 } as never, { id: 'legacy-only', amount: 5 } as never] },
    profile,
    []
  );

  assert.deepEqual(result.transactions, [
    { id: 'same', amount: 20 },
    { id: 'legacy-only', amount: 5 },
  ]);
});

test('Firestore wins matching migration IDs while distinct local records are retained once', () => {
  const result = mergeRemoteAndLocalData(
    {
      transactions: [{ id: 'same', amount: 30 } as never],
      categories: [category('food', 'Cloud Food')],
    },
    {
      ...mergeLocalData({}, {}, profile, []),
      transactions: [{ id: 'same', amount: 20 } as never, { id: 'local-only', amount: 7 } as never],
      categories: [category('food', 'Local Food'), category('custom', 'Custom')],
    },
    [category('default', 'Default')]
  );

  assert.deepEqual(result.transactions, [
    { id: 'same', amount: 30 },
    { id: 'local-only', amount: 7 },
  ]);
  assert.equal(result.categories.find((item) => item.id === 'food')?.name, 'Cloud Food');
  assert.equal(result.categories.filter((item) => item.id === 'custom').length, 1);
});

test('default categories are used only when neither local nor remote has category documents', () => {
  const defaults = [category('default', 'Default')];
  const local = mergeLocalData({}, {}, profile, defaults);
  const result = mergeRemoteAndLocalData({}, local, defaults);
  assert.deepEqual(result.categories, defaults);
});

test('document-level diff emits only changed/new records and deletes removed IDs', () => {
  const changes = diffRecords(
    'transactions',
    [{ id: 'keep', amount: 1 }, { id: 'edit', amount: 1 }, { id: 'delete', amount: 3 }],
    [{ id: 'keep', amount: 1 }, { id: 'edit', amount: 2 }, { id: 'new', amount: 4 }]
  );

  assert.deepEqual(changes.upserts, [{ id: 'edit', amount: 2 }, { id: 'new', amount: 4 }]);
  assert.deepEqual(changes.deletes, ['delete']);
});

test('budget diff uses month as the stable identity', () => {
  const changes = diffRecords(
    'budgets',
    [{ id: 'budget_a', month: '2026-09', totalBudget: 10 }, { id: 'budget_b', month: '2026-10', totalBudget: 20 }],
    [{ id: 'budget_a', month: '2026-09', totalBudget: 15 }]
  );

  assert.equal(changes.upserts.length, 1);
  assert.equal(changes.upserts[0].month, '2026-09');
  assert.deepEqual(changes.deletes, ['2026-10']);
});

test('document IDs are stable, path-safe, and distinct for slash-containing source IDs', () => {
  const slashId = toFirestoreDocumentId('tx/one');
  assert.equal(slashId, toFirestoreDocumentId('tx/one'));
  assert.ok(!slashId.includes('/'));
  assert.notEqual(slashId, toFirestoreDocumentId('tx_one'));
});


test('transaction merge order keeps the newest date and time first for the dashboard', () => {
  const result = sortTransactionsNewestFirst([
    { id: 'old', date: '2026-09-30', time: '12:00' },
    { id: 'late', date: '2026-10-01', time: '18:45' },
    { id: 'early', date: '2026-10-01', time: '08:15' },
  ] as never[]);

  assert.deepEqual(result.map((record) => record.id), ['late', 'early', 'old']);
});


test('remote monthly budgets win matching months while local-only months are retained', () => {
  const budget = (id: string, month: string, totalBudget: number) => ({
    id,
    month,
    totalBudget,
    categoryBudgets: {},
    warningThresholds: { warn75: true, warn90: true, warn100: true },
  });
  const local = {
    ...mergeLocalData({}, {}, profile, []),
    budgets: {
      '2026-09': budget('local-september', '2026-09', 90),
      '2026-10': budget('local-october', '2026-10', 100),
    },
  };
  const result = mergeRemoteAndLocalData(
    { budgets: { '2026-09': budget('cloud-september', '2026-09', 120) } },
    local,
    []
  );

  assert.equal(result.budgets['2026-09'].totalBudget, 120);
  assert.equal(result.budgets['2026-09'].id, 'cloud-september');
  assert.equal(result.budgets['2026-10'].totalBudget, 100);
});
