import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_META, type Entry, type Meta } from './types';

interface Schema extends DBSchema {
  entries: { key: string; value: Entry };
  meta: { key: keyof Meta; value: Meta[keyof Meta] };
}

const DB_NAME = '1in2out';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('entries', { keyPath: 'id' });
        database.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

export async function loadAll(): Promise<{ entries: Entry[]; meta: Meta }> {
  const d = await db();
  const [entries, lastExportAt, lastUsedType] = await Promise.all([
    d.getAll('entries'),
    d.get('meta', 'lastExportAt'),
    d.get('meta', 'lastUsedType'),
  ]);
  return {
    entries,
    meta: {
      lastExportAt: (lastExportAt as Meta['lastExportAt'] | undefined) ?? DEFAULT_META.lastExportAt,
      lastUsedType: (lastUsedType as Meta['lastUsedType'] | undefined) ?? DEFAULT_META.lastUsedType,
    },
  };
}

export async function putEntry(entry: Entry): Promise<void> {
  await (await db()).put('entries', entry);
}

export async function deleteEntry(id: string): Promise<void> {
  await (await db()).delete('entries', id);
}

/** Ersetzt den kompletten Bestand in einer Transaktion. */
export async function replaceAllEntries(entries: readonly Entry[]): Promise<void> {
  const tx = (await db()).transaction('entries', 'readwrite');
  await tx.store.clear();
  for (const e of entries) void tx.store.put(e);
  await tx.done;
}

export async function setMeta<K extends keyof Meta>(key: K, value: Meta[K]): Promise<void> {
  await (await db()).put('meta', value, key);
}

/** Beim ersten Start dauerhaften Speicher anfragen (Safari räumt sonst nach 7 Tagen ohne Nutzung auf). */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return;
    await navigator.storage?.persist?.();
  } catch {
    // nicht kritisch
  }
}
