import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ScreenToast, type ScreenToastData } from './components/ScreenToast';
import { TabBar } from './components/TabBar';
import { formatSigned, nameWithQuantity, preselectedType, saldo, type SheetOrigin } from './lib/calc';
import { parseBackupCsv, type ImportResult } from './lib/csv';
import { exportEntries } from './lib/exportCsv';
import type { EntriesTab, Entry, EntryType } from './lib/types';
import { useStore } from './lib/useStore';
import { BackupScreen } from './screens/BackupScreen';
import { EntriesScreen } from './screens/EntriesScreen';
import { SaldoScreen } from './screens/SaldoScreen';
import { EntrySheet, NAME_INPUT_ID } from './sheets/EntrySheet';
import { ImportSheet } from './sheets/ImportSheet';

type View = 'saldo' | 'entries' | 'backup';

type SheetState =
  | { kind: 'entry-new'; initialType: EntryType }
  | { kind: 'entry-edit'; entry: Entry }
  | { kind: 'import'; fileName: string; size: number; result: ImportResult }
  | null;

export function App() {
  const store = useStore();
  const [view, setView] = useState<View>('saldo');
  const [entriesTab, setEntriesTab] = useState<EntriesTab>('all');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<ScreenToastData | null>(null);
  const toastKey = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const showToast = useCallback((content: ReactNode, opts: { undo?: () => void; duration?: number } = {}) => {
    toastKey.current += 1;
    setToast({ key: toastKey.current, content, undo: opts.undo, duration: opts.duration ?? (opts.undo ? 5000 : 3000) });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  // ---------- Navigation ----------

  const goSaldo = () => setView('saldo');
  const goEntries = () => {
    // Über die Tab-Leiste startet „Einträge“ immer mit „Alle“ (4.3)
    setEntriesTab('all');
    setView('entries');
  };

  const openNewEntry = () => {
    const origin: SheetOrigin =
      view === 'entries' ? { screen: 'entries', tab: entriesTab } : view === 'backup' ? { screen: 'backup' } : { screen: 'saldo' };
    // synchron rendern und fokussieren, damit iOS die Tastatur in derselben Geste öffnet
    flushSync(() => setSheet({ kind: 'entry-new', initialType: preselectedType(origin, store.meta.lastUsedType) }));
    document.getElementById(NAME_INPUT_ID)?.focus({ preventScroll: true });
  };

  // ---------- Export ----------

  const runExport = useCallback(async () => {
    const outcome = await exportEntries(store.entries);
    if (outcome === 'shared' || outcome === 'downloaded') store.setLastExportAt(new Date().toISOString());
    return outcome;
  }, [store]);

  // ---------- Import ----------

  const pickFile = () => fileInput.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setSheet({ kind: 'import', fileName: file.name, size: file.size, result: parseBackupCsv(text) });
  };

  const confirmImport = async (entries: Entry[]) => {
    await store.replaceAll(entries);
    showToast(`${entries.length} ${entries.length === 1 ? 'Eintrag' : 'Einträge'} importiert`);
  };

  // ---------- Einträge ----------

  const deleteEntry = (entry: Entry) => {
    store.remove(entry.id);
    showToast(
      <>
        <b>{nameWithQuantity(entry.name, entry.quantity)}</b> gelöscht
      </>,
      { undo: () => store.restore(entry) },
    );
  };

  const saveNew = (entry: Entry) => {
    store.add(entry);
    store.setLastUsedType(entry.type);
  };

  const saveEdit = (entry: Entry) => {
    const original = store.entries.find((e) => e.id === entry.id);
    const next = store.entries.map((e) => (e.id === entry.id ? entry : e));
    store.update(entry);
    // lastUsedType folgt jedem Speichern – außer wenn beim Bearbeiten der Typ gewechselt wurde (4.2)
    if (original && original.type === entry.type) store.setLastUsedType(entry.type);
    // das Sheet schließt sich selbst (mit Animation)
    showToast(`Gespeichert · Saldo jetzt ${formatSigned(saldo(next))}`);
  };

  // Offener Toast verschwindet nicht beim Tab-Wechsel, aber beim Öffnen eines Sheets
  useEffect(() => {
    if (sheet) setToast(null);
  }, [sheet]);

  if (!store.ready) return <div className="app" aria-busy="true" />;

  return (
    <>
      <div className={`app${sheet ? ' app--behind-sheet' : ''}`} inert={sheet ? true : undefined}>
        <main className="app__main">
          {view === 'saldo' && (
            <SaldoScreen
              entries={store.entries}
              lastExportAt={store.meta.lastExportAt}
              onOpenBackup={() => setView('backup')}
              onExport={runExport}
            />
          )}
          {view === 'entries' && (
            <EntriesScreen
              entries={store.entries}
              tab={entriesTab}
              onTabChange={setEntriesTab}
              onEdit={(entry) => setSheet({ kind: 'entry-edit', entry })}
              onDelete={deleteEntry}
            />
          )}
          {view === 'backup' && (
            <BackupScreen
              entries={store.entries}
              lastExportAt={store.meta.lastExportAt}
              onBack={goSaldo}
              onExport={runExport}
              onImport={pickFile}
            />
          )}
        </main>
        <TabBar active={view === 'entries' ? 'entries' : 'saldo'} onSaldo={goSaldo} onPlus={openNewEntry} onEntries={goEntries} />
      </div>

      {toast && <ScreenToast key={toast.key} data={toast} onDone={clearToast} />}

      {sheet?.kind === 'entry-new' && (
        <EntrySheet
          mode="new"
          initialType={sheet.initialType}
          entries={store.entries}
          onSave={saveNew}
          onClosed={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'entry-edit' && (
        <EntrySheet
          mode="edit"
          entry={sheet.entry}
          initialType={sheet.entry.type}
          entries={store.entries}
          onSave={saveEdit}
          onClosed={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'import' && (
        <ImportSheet
          fileName={sheet.fileName}
          size={sheet.size}
          result={sheet.result}
          currentCount={store.entries.length}
          onConfirm={confirmImport}
          onExport={runExport}
          onPickOther={pickFile}
          onClosed={() => setSheet(null)}
        />
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFileChosen}
      />
    </>
  );
}
