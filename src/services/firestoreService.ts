import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import type { Category, MonthlyBudget, Transaction, UserProfile } from '../types';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';
import { storageService } from './storageService';
import { db } from './firebase';
import {
  diffRecords,
  getCollectionRecordId,
  sortTransactionsNewestFirst,
  toFirestoreDocumentId,
  type PartialTrackerData,
  type TrackerData,
  type UserDataCollection,
} from './firestoreDataModel';

export type SyncStatus = 'loading' | 'syncing' | 'saving' | 'saved' | 'offline' | 'error';

export interface UserSyncCallbacks {
  onData: (data: TrackerData) => void;
  onStatus: (status: SyncStatus, message?: string) => void;
  onReady: () => void;
}

interface BatchOperation {
  type: 'set' | 'delete';
  path: string[];
  data?: DocumentData;
}

const COLLECTIONS: UserDataCollection[] = [
  'transactions',
  'categories',
  'budgets',
  'savingsGoals',
  'creditDebitRecords',
  'loans',
];

function cleanFirestoreValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanFirestoreValue);
  if (!value || typeof value !== 'object') return value;
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, cleanFirestoreValue(item)])
  );
}

function withoutServerMetadata(data: DocumentData): DocumentData {
  const { createdAtServer: _createdAtServer, updatedAtServer: _updatedAtServer, userId: _userId, ...record } = data;
  return record;
}

function documentsFromSnapshot<T extends { id: string }>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map((document) => {
    const data = withoutServerMetadata(document.data());
    return { ...data, id: typeof data.id === 'string' && data.id ? data.id : document.id } as T;
  });
}

function budgetsFromSnapshot(snapshot: QuerySnapshot<DocumentData>): Record<string, MonthlyBudget> {
  const budgets: Record<string, MonthlyBudget> = {};
  for (const budget of documentsFromSnapshot<MonthlyBudget & { month: string }>(snapshot)) {
    const month = budget.month || budget.id;
    if (month) budgets[month] = { ...budget, month };
  }
  return budgets;
}

function profileFromDocument(data: DocumentData): UserProfile {
  return withoutServerMetadata(data) as UserProfile;
}

function recordsForCollection(
  collectionName: UserDataCollection,
  data: PartialTrackerData
): Array<Record<string, unknown> & { id?: string; month?: string }> {
  if (collectionName === 'budgets') {
    return Object.entries(data.budgets || {}).map(([month, budget]) => ({ ...budget, month: budget.month || month }));
  }
  const records = data[collectionName];
  return Array.isArray(records)
    ? records as unknown as Array<Record<string, unknown> & { id?: string; month?: string }>
    : [];
}

function recordPath(uid: string, collectionName: UserDataCollection, id: string): string[] {
  return ['users', uid, collectionName, toFirestoreDocumentId(id)];
}

function userOwnedRecord(uid: string, record: Record<string, unknown>, id: string, isNew: boolean): DocumentData {
  const appRecordId = typeof record.id === 'string' && record.id ? record.id : id;
  const cleanRecord = cleanFirestoreValue({ ...record, id: appRecordId }) as DocumentData;
  return {
    ...cleanRecord,
    userId: uid,
    ...(isNew ? { createdAtServer: serverTimestamp() } : {}),
    updatedAtServer: serverTimestamp(),
  };
}

async function commitOperations(operations: BatchOperation[]): Promise<void> {
  const batchSize = 450;
  for (let index = 0; index < operations.length; index += batchSize) {
    const batch = writeBatch(db);
    for (const operation of operations.slice(index, index + batchSize)) {
      const reference = doc(db, operation.path.join('/'));
      if (operation.type === 'delete') batch.delete(reference);
      else batch.set(reference, operation.data || {}, { merge: true });
    }
    await batch.commit();
  }
}

export function getFriendlySyncError(error: unknown): string {
  const candidate = error as { code?: string; message?: string };
  if (candidate?.code?.includes('permission-denied')) {
    return 'Firestore denied access. Publish the UID-only Firestore rules in Firebase Console.';
  }
  if (candidate?.code?.includes('unavailable') || candidate?.code?.includes('network')) {
    return 'Cloud storage is temporarily unavailable. Your browser-local copy is retained; Firestore has not confirmed the sync.';
  }
  return `Cloud sync failed${candidate?.code ? ` (${candidate.code})` : ''}. Your browser-local copy is retained; Firestore has not confirmed the sync.`;
}

function applyAndPublish(data: TrackerData, callbacks: UserSyncCallbacks): void {
  storageService.applyCloudSnapshot(data);
  callbacks.onData(data);
}

/**
 * Starts real-time Firestore listeners for the authenticated user.
 * Loads live data using onSnapshot (expenses list, profile, budgets, etc.)
 * so any Add/Edit/Delete or Receipt upload reflects instantly across all open
 * browsers and devices without needing a page refresh.
 * 
 * Safely manages unsubscribe functions on logout and page unload to prevent memory leaks.
 */
export function startUserDataSync(uid: string, callbacks: UserSyncCallbacks): () => void {
  // If demo/guest account, skip remote Firestore to avoid permission-denied errors
  if (uid === 'guest_user' || uid === 'default_user') {
    const local = storageService.getCurrentSnapshot();
    applyAndPublish(local, callbacks);
    callbacks.onReady();
    callbacks.onStatus('saved');
    return () => {};
  }

  let disposed = false;
  let readyNotified = false;
  const listenerStops: Array<() => void> = [];

  const stopListeners = () => {
    for (const stop of listenerStops) {
      try {
        stop();
      } catch (err) {
        console.warn('[Firestore] Error stopping real-time listener:', err);
      }
    }
    listenerStops.length = 0;
  };

  const notifyReady = () => {
    if (!readyNotified) {
      readyNotified = true;
      callbacks.onReady();
    }
  };

  // Immediate local state push so UI is instantly populated without blank screen
  const initialLocalData = storageService.getCurrentSnapshot();
  applyAndPublish(initialLocalData, callbacks);
  let currentTrackerData: TrackerData = { ...initialLocalData };

  callbacks.onStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'syncing');

  // Central error handler for onSnapshot listeners
  const handleListenerError = (collectionOrDocName: string, error: unknown) => {
    if (disposed) return;
    console.error(`[Firestore Real-time Listener Error - ${collectionOrDocName}]:`, error);
    const candidate = error as { code?: string; message?: string };
    if (candidate?.code?.includes('permission-denied')) {
      console.error(
        `[Firestore Permission Denied]: Access denied for path users/${uid}/${collectionOrDocName}. Please ensure security rules permit authenticated access.`
      );
    }
    callbacks.onStatus(
      typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error',
      getFriendlySyncError(error)
    );
  };

  // 1. Real-time User Profile Listener (onSnapshot on doc users/{uid})
  try {
    const userRef = doc(db, 'users', uid);
    const unsubProfile = onSnapshot(
      userRef,
      (snapshot) => {
        if (disposed) return;
        if (snapshot.exists()) {
          const profile = profileFromDocument(snapshot.data());
          currentTrackerData = { ...currentTrackerData, profile };
          applyAndPublish(currentTrackerData, callbacks);
        } else {
          // Initialize remote document for first-time sign-ups
          const defaultProf = storageService.getProfile();
          void setDoc(
            userRef,
            {
              ...(cleanFirestoreValue(defaultProf) as DocumentData),
              userId: uid,
              createdAtServer: serverTimestamp(),
              updatedAtServer: serverTimestamp(),
            },
            { merge: true }
          ).catch((err) => {
            console.error('[Firestore] Error creating initial user profile document:', err);
          });
        }
        notifyReady();
        callbacks.onStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saved');
      },
      (error) => handleListenerError('profile', error)
    );
    listenerStops.push(unsubProfile);
  } catch (err) {
    handleListenerError('profile', err);
  }

  // 2. Real-time Subcollection Listeners (Transactions, Categories, Budgets, Savings, Credit/Debit, Loans)
  for (const collectionName of COLLECTIONS) {
    try {
      const colRef = collection(db, 'users', uid, collectionName);
      const unsubCollection = onSnapshot(
        colRef,
        (snapshot) => {
          if (disposed) return;

          // If categories are empty on brand new user account, seed default categories
          if (snapshot.empty && collectionName === 'categories') {
            const defaultCats = storageService.getCategories();
            for (const cat of defaultCats) {
              const catRef = doc(db, 'users', uid, 'categories', toFirestoreDocumentId(cat.id));
              void setDoc(catRef, userOwnedRecord(uid, cat as unknown as Record<string, unknown>, cat.id, true), { merge: true }).catch(console.warn);
            }
          }

          if (collectionName === 'transactions') {
            // Live Expenses List: automatically re-renders smoothly across all open devices
            const liveTxs = sortTransactionsNewestFirst(documentsFromSnapshot<Transaction>(snapshot));
            currentTrackerData = { ...currentTrackerData, transactions: liveTxs };
          } else if (collectionName === 'categories') {
            const liveCategories = documentsFromSnapshot<Category & { id: string }>(snapshot);
            currentTrackerData = {
              ...currentTrackerData,
              categories: liveCategories.length ? liveCategories : [...DEFAULT_CATEGORIES],
            };
          } else if (collectionName === 'budgets') {
            currentTrackerData = { ...currentTrackerData, budgets: budgetsFromSnapshot(snapshot) };
          } else if (collectionName === 'savingsGoals') {
            currentTrackerData = { ...currentTrackerData, savingsGoals: documentsFromSnapshot(snapshot) };
          } else if (collectionName === 'creditDebitRecords') {
            currentTrackerData = { ...currentTrackerData, creditDebitRecords: documentsFromSnapshot(snapshot) };
          } else if (collectionName === 'loans') {
            currentTrackerData = { ...currentTrackerData, loans: documentsFromSnapshot(snapshot) };
          }

          // Push updated state: updates localStorage & React state triggers smooth re-render
          applyAndPublish(currentTrackerData, callbacks);
          notifyReady();
          callbacks.onStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saved');
        },
        (error) => handleListenerError(collectionName, error)
      );
      listenerStops.push(unsubCollection);
    } catch (err) {
      handleListenerError(collectionName, err);
    }
  }

  // Prevent memory leaks on page unload / tab close
  const handlePageUnload = () => {
    stopListeners();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload);
  }

  // Return unsubscribe cleanup function for React unmount (e.g. on user logout)
  return () => {
    disposed = true;
    stopListeners();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handlePageUnload);
      window.removeEventListener('pagehide', handlePageUnload);
    }
  };
}

/** Persist document-level creates, updates, and deletes after local-first writes. */
export async function persistUserDataChanges(
  uid: string,
  family: keyof TrackerData,
  previous: unknown,
  next: unknown
): Promise<void> {
  if (family === 'profile') {
    const before = previous as UserProfile;
    const after = next as UserProfile;
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    const reference = doc(db, 'users', uid);
    const data = cleanFirestoreValue(after) as DocumentData;
    await setDoc(reference, {
      ...data,
      userId: uid,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
    return;
  }

  const collectionName = family as UserDataCollection;
  const toArray = (value: unknown): Array<Record<string, unknown> & { id?: string; month?: string }> => {
    if (collectionName === 'budgets') {
      return Object.entries((value || {}) as Record<string, MonthlyBudget>).map(([month, budget]) => ({
        ...budget,
        month: budget.month || month,
      }));
    }
    return Array.isArray(value) ? value : [];
  };

  const changes = diffRecords(collectionName, toArray(previous), toArray(next));
  const operations: BatchOperation[] = [];
  for (const record of changes.upserts) {
    const id = getCollectionRecordId(collectionName, record);
    operations.push({
      type: 'set',
      path: recordPath(uid, collectionName, id),
      data: userOwnedRecord(uid, record, id, !toArray(previous).some((old) => {
        try {
          return getCollectionRecordId(collectionName, old) === id;
        } catch {
          return false;
        }
      })),
    });
  }
  for (const id of changes.deletes) {
    operations.push({ type: 'delete', path: recordPath(uid, collectionName, id) });
  }
  if (operations.length) await commitOperations(operations);
}
