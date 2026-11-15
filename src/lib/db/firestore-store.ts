import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { DatabaseSchema } from './database';

export const collections = ['profiles', 'members', 'medications', 'doseLogs', 'appointments', 'dispatchedEmails', 'auditLogs', 'notifications', 'prescriptionDrafts'] as const;
export interface StorageScope { profileId?: string; tables?: readonly (typeof collections[number])[]; }

export function emptyDatabase(): DatabaseSchema {
  return Object.fromEntries(collections.map((name) => [name, []])) as unknown as DatabaseSchema;
}

export class StorageError extends Error {
  constructor(message: string, public code = 'STORAGE_UNAVAILABLE') { super(message); }
}

export interface DurableStore {
  runExclusive<T>(operation: (data: DatabaseSchema) => Promise<T>, scope?: StorageScope): Promise<T>;
}

// All API workers share this lease. The callback runs ONCE (it may call email or
// Gemini); only the short lock/commit transactions may be retried by Firestore.
// Fencing prevents a timed-out worker from overwriting a newer worker's state.
export class FirestoreStore implements DurableStore {
  constructor(private firestore: Firestore, private lockName = 'care-circle') {}

  async runExclusive<T>(operation: (data: DatabaseSchema) => Promise<T>, scope?: StorageScope): Promise<T> {
    const lock = this.firestore.collection('_curacircleLocks').doc(this.lockName);
    const owner = randomUUID();
    const deadline = Date.now() + 8000;
    let acquired = false;
    while (!acquired) {
      acquired = await this.firestore.runTransaction(async (tx) => {
        const current = await tx.get(lock);
        if (current.exists && current.get('expiresAt') > Date.now()) return false;
        tx.set(lock, { owner, expiresAt: Date.now() + 120000 });
        return true;
      });
      if (!acquired) {
        if (Date.now() >= deadline) throw new StorageError('Your care circle is busy. Please retry in a few seconds.', 'STORAGE_BUSY');
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 150));
      }
    }
    try {
      const data = emptyDatabase();
      const tables = scope?.tables || collections;
      const snapshots = await Promise.all(tables.map(async (name) => {
        const collection = this.firestore.collection(name);
        if (name === 'profiles' && scope?.profileId) {
          const doc = await collection.doc(scope.profileId).get();
          return doc.exists ? [doc] : [];
        }
        const query = scope?.profileId ? collection.where('profileId', '==', scope.profileId) : collection;
        return (await query.get()).docs;
      }));
      const original = new Map<string, string>();
      snapshots.forEach((snapshot, index) => {
        const name = tables[index];
        for (const doc of snapshot) {
          const record = { ...doc.data(), id: doc.id };
          (data[name] as unknown[]).push(record);
          original.set(`${name}/${doc.id}`, JSON.stringify(record));
        }
      });
      data.auditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      data.dispatchedEmails.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
      data.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const result = await operation(data);
      if (result instanceof Response && !result.ok) return result;
      const changed = new Map<string, Record<string, unknown>>();
      for (const name of collections) {
        for (const record of data[name]) {
          const key = `${name}/${record.id}`;
          const serialized = JSON.stringify(record);
          if (original.get(key) !== serialized) changed.set(key, JSON.parse(serialized));
          original.delete(key);
        }
      }
      // Keep each operation atomic. Never silently split a mutation into batches.
      if (changed.size + original.size > 450) throw new StorageError('This update is too large. Please split it into smaller updates.');
      await this.firestore.runTransaction(async (tx) => {
        const current = await tx.get(lock);
        if (current.get('owner') !== owner || current.get('expiresAt') <= Date.now()) {
          throw new StorageError('The save timed out. Refresh your schedule before retrying.');
        }
        changed.forEach((value, key) => tx.set(this.firestore.doc(key), value));
        original.forEach((_value, key) => tx.delete(this.firestore.doc(key)));
        tx.delete(lock);
      });
      return result;
    } finally {
      await this.firestore.runTransaction(async (tx) => {
        const current = await tx.get(lock);
        if (current.get('owner') === owner) tx.delete(lock);
      }).catch(() => { /* An abandoned lease expires; never hide the original failure. */ });
    }
  }
}

export async function productionStore(): Promise<DurableStore> {
  try {
    const { cert, getApps, initializeApp, applicationDefault } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!credentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new StorageError('Persistent storage is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on the server.', 'STORAGE_CONFIGURATION_ERROR');
    }
    const app = getApps().find((app) => app.name === 'curacircle-storage') || initializeApp({
      credential: credentials ? cert(JSON.parse(credentials)) : applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }, 'curacircle-storage');
    return new FirestoreStore(getFirestore(app));
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError('Persistent storage could not be initialized. Check the server Firebase credentials.', 'STORAGE_CONFIGURATION_ERROR');
  }
}
