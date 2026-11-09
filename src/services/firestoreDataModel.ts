import type {
  Category,
  CreditDebitRecord,
  Loan,
  MonthlyBudget,
  SavingsGoal,
  Transaction,
  UserProfile,
} from '../types';

export interface TrackerData {
  profile: UserProfile;
  categories: Category[];
  transactions: Transaction[];
  budgets: Record<string, MonthlyBudget>;
  savingsGoals: SavingsGoal[];
  creditDebitRecords: CreditDebitRecord[];
  loans: Loan[];
}

export type PartialTrackerData = Partial<TrackerData>;

export interface TrackerDataSources {
  user: PartialTrackerData;
  legacy: PartialTrackerData;
}

export type UserDataCollection = Exclude<keyof TrackerData, 'profile'>;

function mergeRecordsById<T extends { id: string }>(
  primary: T[] = [],
  secondary: T[] = [],
  tertiary: T[] = []
): T[] {
  const records = new Map<string, T>();
  // Source priority: primary (remote or UID-scoped local), then secondary, then tertiary.
  for (const record of [...tertiary, ...secondary, ...primary]) {
    if (record && typeof record.id === 'string' && record.id.length > 0) {
      records.set(record.id, record);
    }
  }
  return [...records.values()];
}

function mergeBudgetsByMonth(
  primary: Record<string, MonthlyBudget> = {},
  secondary: Record<string, MonthlyBudget> = {},
  tertiary: Record<string, MonthlyBudget> = {}
): Record<string, MonthlyBudget> {
  return { ...tertiary, ...secondary, ...primary };
}

export function sortTransactionsNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => {
    const leftDateTime = `${left.date || ''}T${left.time || '00:00'}`;
    const rightDateTime = `${right.date || ''}T${right.time || '00:00'}`;
    return rightDateTime.localeCompare(leftDateTime);
  });
}

/**
 * Builds the data to migrate from local storage. Existing UID-scoped data wins
 * conflicts with unscoped legacy data; defaults are supplied only when no local
 * category data exists.
 */
export function mergeLocalData(
  user: PartialTrackerData,
  legacy: PartialTrackerData,
  fallbackProfile: UserProfile,
  defaultCategories: Category[]
): TrackerData {
  const categories = mergeRecordsById(user.categories, legacy.categories);
  return {
    profile: { ...fallbackProfile, ...(legacy.profile || {}), ...(user.profile || {}) },
    categories: categories.length ? categories : [...defaultCategories],
    transactions: sortTransactionsNewestFirst(mergeRecordsById(user.transactions, legacy.transactions)),
    budgets: mergeBudgetsByMonth(user.budgets, legacy.budgets),
    savingsGoals: mergeRecordsById(user.savingsGoals, legacy.savingsGoals),
    creditDebitRecords: mergeRecordsById(user.creditDebitRecords, legacy.creditDebitRecords),
    loans: mergeRecordsById(user.loans, legacy.loans),
  };
}

/**
 * Combines Firestore data with local migration candidates. Firestore wins for
 * matching IDs, while distinct local IDs are retained and can be migrated.
 */
export function mergeRemoteAndLocalData(
  remote: PartialTrackerData,
  local: TrackerData,
  defaultCategories: Category[]
): TrackerData {
  const categories = mergeRecordsById(remote.categories, local.categories);
  return {
    profile: { ...local.profile, ...(remote.profile || {}) },
    categories: categories.length ? categories : [...defaultCategories],
    transactions: sortTransactionsNewestFirst(mergeRecordsById(remote.transactions, local.transactions)),
    budgets: mergeBudgetsByMonth(remote.budgets, local.budgets),
    savingsGoals: mergeRecordsById(remote.savingsGoals, local.savingsGoals),
    creditDebitRecords: mergeRecordsById(remote.creditDebitRecords, local.creditDebitRecords),
    loans: mergeRecordsById(remote.loans, local.loans),
  };
}

export function getCollectionRecordId(
  collectionName: UserDataCollection,
  record: { id?: string; month?: string }
): string {
  if (collectionName === 'budgets') {
    const month = record.month || record.id;
    if (!month) throw new Error('Budget record is missing its month identifier.');
    return month;
  }
  if (!record.id) throw new Error(`${collectionName} record is missing its id.`);
  return record.id;
}

/** Encodes app IDs as one Firestore path segment without losing the original ID. */
export function toFirestoreDocumentId(id: string): string {
  const bytes = new TextEncoder().encode(id);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `d_${encoded}`;
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableValue(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? String(value);
}

export interface RecordDiff<T> {
  upserts: T[];
  deletes: string[];
}

/** Computes document-level CRUD changes rather than replacing whole collections. */
export function diffRecords<T extends { id?: string; month?: string }>(
  collectionName: UserDataCollection,
  previous: T[],
  next: T[]
): RecordDiff<T> {
  const before = new Map(previous.map((record) => [getCollectionRecordId(collectionName, record), record]));
  const after = new Map(next.map((record) => [getCollectionRecordId(collectionName, record), record]));
  const upserts: T[] = [];

  for (const [id, record] of after) {
    const oldRecord = before.get(id);
    if (!oldRecord || stableValue(oldRecord) !== stableValue(record)) upserts.push(record);
  }

  return {
    upserts,
    deletes: [...before.keys()].filter((id) => !after.has(id)),
  };
}
