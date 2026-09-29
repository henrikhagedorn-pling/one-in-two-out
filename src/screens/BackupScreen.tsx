import { useState } from 'react';
import { IconChevronLeft, IconExport, IconImport } from '../components/Icons';
import { BACKUP_REMINDER_DAYS, daysSince } from '../lib/calc';
import { formatDaysAgo, formatLongDate } from '../lib/dates';
import type { ExportOutcome } from '../lib/exportCsv';
import type { Entry } from '../lib/types';

interface Props {
  entries: Entry[];
  lastExportAt: string | null;
  onBack: () => void;
  onExport: () => Promise<ExportOutcome>;
  onImport: () => void;
}

export function BackupScreen({ entries, lastExportAt, onBack, onExport, onImport }: Props) {
  const [exporting, setExporting] = useState(false);
  const days = lastExportAt ? daysSince(lastExportAt) : null;

  const exportNow = () => {
    if (exporting) return;
    setExporting(true);
    onExport().finally(() => setExporting(false));
  };

  return (
    <div className="screen backup">
      <header className="header header--back">
        <button type="button" className="back-button" onClick={onBack}>
          <IconChevronLeft size={22} />
          <span>Saldo</span>
        </button>
      </header>

      <div className="backup__body">
        <h1 className="page-title">Backup</h1>

        <div className="backup__status">
          <div className="status-row">
            <span className="status-row__label">Letztes Backup</span>
            {days === null ? (
              <span className="status-row__value">noch nie</span>
            ) : (
              <span className="status-row__stack">
                <span className={`status-row__value${days >= BACKUP_REMINDER_DAYS ? ' tone-negative' : ''}`}>
                  {formatDaysAgo(days)}
                </span>
                <span className="status-row__sub">{formatLongDate(new Date(lastExportAt!))}</span>
              </span>
            )}
          </div>
          <div className="status-row">
            <span className="status-row__label">Einträge auf diesem Gerät</span>
            <span className="status-row__value num">{entries.length}</span>
          </div>
        </div>

        <div className="backup__action">
          <button type="button" className="button button--primary" onClick={exportNow} disabled={exporting}>
            <IconExport size={20} />
            <span>CSV exportieren</span>
          </button>
          <p className="backup__hint">Öffnet das Teilen-Menü. Dort „In Dateien sichern“ und iCloud Drive wählen.</p>
        </div>

        <div className="backup__action">
          <button type="button" className="button button--secondary" onClick={onImport}>
            <IconImport size={20} />
            <span>CSV importieren</span>
          </button>
          <p className="backup__hint">Ersetzt den kompletten Bestand. Vorher siehst du eine Prüfung der Datei.</p>
        </div>

        <p className="backup__footnote">
          Deine Daten liegen nur in diesem Browser, gebunden an diese Adresse. Vor einem Umzug exportieren und in der neuen
          Instanz importieren.
        </p>
      </div>
    </div>
  );
}
