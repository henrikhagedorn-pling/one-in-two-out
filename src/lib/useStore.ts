import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from './db';
import { DEFAULT_META, type Entry, type EntryType, type Meta } from './types';

export interface Store {
  ready: boolean;
  entries: Entry[];
  meta: Meta;
  add: (entry: Entry) => void;
  update: (entry: Entry) => void;
  remove: (id: string) => Entry | undefined;
  restore: (entry: Entry) => void;
  replaceAll: (entries: Entry[]) => Promise<void>;
  setLastUsedType: (type: EntryType) => void;
  setLastExportAt: (iso: string) => void;
}

/**
 * Zustand im Speicher, jede Änderung wird sofort in IndexedDB geschrieben.
 * Die UI aktualisiert sich optimistisch.
 */
export function useStore(): Store {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [meta, setMeta] = useState<Meta>(DEFAULT_META);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    let cancelled = false;
    db.loadAll()
      .then((s) => {
        if (cancelled) return;
        setEntries(s.entries);
        setMeta(s.meta);
        setReady(true);
      })
      .catch((err) => {
        console.error('IndexedDB nicht verfügbar', err);
        if (!cancelled) setReady(true);
      });
    void db.requestPersistence();
    return () => {
      cancelled = true;
    };
  }, []);

  const logError = (err: unknown) => console.error('Speichern fehlgeschlagen', err);

  const add = useCallback((entry: Entry) => {
    setEntries((es) => [...es, entry]);
    db.putEntry(entry).catch(logError);
  }, []);

  const update = useCallback((entry: Entry) => {
    setEntries((es) => es.map((e) => (e.id === entry.id ? entry : e)));
    db.putEntry(entry).catch(logError);
  }, []);

  const remove = useCallback((id: string) => {
    const found = entriesRef.current.find((e) => e.id === id);
    setEntries((es) => es.filter((e) => e.id !== id));
    db.deleteEntry(id).catch(logError);
    return found;
  }, []);

  const restore = useCallback((entry: Entry) => {
    setEntries((es) => (es.some((e) => e.id === entry.id) ? es : [...es, entry]));
    db.putEntry(entry).catch(logError);
  }, []);

  const replaceAll = useCallback(async (next: Entry[]) => {
    await db.replaceAllEntries(next);
    setEntries(next);
  }, []);

  const setLastUsedType = useCallback((type: EntryType) => {
    setMeta((m) => ({ ...m, lastUsedType: type }));
    db.setMeta('lastUsedType', type).catch(logError);
  }, []);

  const setLastExportAt = useCallback((iso: string) => {
    setMeta((m) => ({ ...m, lastExportAt: iso }));
    db.setMeta('lastExportAt', iso).catch(logError);
  }, []);

  return { ready, entries, meta, add, update, remove, restore, replaceAll, setLastUsedType, setLastExportAt };
}
