import { useState } from 'react';
import { IconCheck, IconFile, IconWarning } from '../components/Icons';
import type { ImportResult } from '../lib/csv';
import { formatRange } from '../lib/dates';
import type { ExportOutcome } from '../lib/exportCsv';
import type { Entry } from '../lib/types';
import { Sheet, SheetHeader } from './Sheet';

interface Props {
  fileName: string;
  size: number;
  result: ImportResult;
  currentCount: number;
  onConfirm: (entries: Entry[]) => Promise<void>;
  onExport: () => Promise<ExportOutcome>;
  onPickOther: () => void;
  onClosed: () => void;
}

const MAX_ERRORS_SHOWN = 50;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

const entriesWord = (n: number) => (n === 1 ? 'Eintrag' : 'Einträge');
const entriesDative = (n: number) => (n === 1 ? 'Eintrag' : 'Einträgen');

export function ImportSheet({ fileName, size, result, currentCount: countNow, onConfirm, onExport, onPickOther, onClosed }: Props) {
  // Bestand beim Öffnen festhalten, damit Text und Button während der Schließ-Animation nicht springen
  const [currentCount] = useState(countNow);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportFirst = () => {
    if (exporting) return;
    setExporting(true);
    onExport().finally(() => setExporting(false));
  };

  return (
    <Sheet
      label="Import prüfen"
      onClosed={onClosed}
      header={(close) => (
        <SheetHeader
          left={
            <button type="button" className="sheet__text-button" onClick={close}>
              {result.ok ? 'Abbrechen' : 'Schließen'}
            </button>
          }
          title="Import prüfen"
        />
      )}
    >
      {(close) => (
        <div className="import">
          <div className="import__file">
            <IconFile size={18} />
            <span className="import__file-name">{fileName}</span>
            <span>{formatSize(size)}</span>
          </div>

          <div className="import__count">
            {result.total} {entriesWord(result.total)} gefunden
          </div>

          {result.ok ? (
            <>
              <div className="import__verdict tone-positive">
                <IconCheck size={18} />
                <span>0 fehlerhaft</span>
              </div>

              <div className="ledger__cols import__cols">
                <div className="ledger__col">
                  <span className="ledger__col-label">Raus</span>
                  <span className="num ledger__col-value ledger__col-value--s">{result.stats.out}</span>
                </div>
                <div className="ledger__col">
                  <span className="ledger__col-label">Rein</span>
                  <span className="num ledger__col-value ledger__col-value--s">{result.stats.in}</span>
                </div>
                <div className="ledger__col">
                  <span className="ledger__col-label">Ersatz</span>
                  <span className="num ledger__col-value ledger__col-value--s">{result.stats.replacement}</span>
                </div>
              </div>
              {result.range && (
                <div className="import__range">
                  <span className="muted">Zeitraum</span>
                  <span>{formatRange(result.range.from, result.range.to)}</span>
                </div>
              )}

              {currentCount > 0 && (
                <div className="warnbox">
                  <IconWarning size={20} className="warnbox__icon" />
                  <div className="warnbox__body">
                    <p>
                      Ersetzt deinen aktuellen Bestand von{' '}
                      <b>
                        {currentCount} {entriesDative(currentCount)}
                      </b>{' '}
                      vollständig. Das lässt sich nicht rückgängig machen.
                    </p>
                    <button type="button" className="warnbox__link" onClick={exportFirst} disabled={exporting}>
                      Erst aktuellen Stand exportieren
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="button button--destructive import__action"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onConfirm(result.entries);
                    close();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {currentCount > 0 ? 'Bestand ersetzen' : 'Importieren'}
              </button>
            </>
          ) : (
            <>
              <div className="import__verdict tone-negative">
                <IconWarning size={18} />
                <span>{result.errors.length} fehlerhaft · Import abgebrochen</span>
              </div>

              <ul className="import__errors">
                {result.errors.slice(0, MAX_ERRORS_SHOWN).map((err) => (
                  <li key={err.line} className="import__error">
                    <span className="num import__error-line">Zeile {err.line}</span>
                    <span className="import__error-messages">
                      {err.messages.map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              {result.errors.length > MAX_ERRORS_SHOWN && (
                <p className="import__hint">und {result.errors.length - MAX_ERRORS_SHOWN} weitere fehlerhafte Zeilen</p>
              )}
              <p className="import__hint">Zeilennummern wie in Numbers, Kopfzeile ist Zeile 1.</p>
              <p className="import__unchanged">Dein aktueller Bestand bleibt unverändert.</p>

              <button type="button" className="button button--primary import__action" onClick={onPickOther}>
                Andere Datei wählen
              </button>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
