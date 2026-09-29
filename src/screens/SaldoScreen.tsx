import { useState } from 'react';
import { IconArchive, IconChevronRight } from '../components/Icons';
import { backupReminder, backupReminderText, netReduction, netReductionLabel, saldo, saldoStatus, totals } from '../lib/calc';
import type { ExportOutcome } from '../lib/exportCsv';
import type { Entry } from '../lib/types';

interface Props {
  entries: Entry[];
  lastExportAt: string | null;
  onOpenBackup: () => void;
  onExport: () => Promise<ExportOutcome>;
}

export function SaldoScreen({ entries, lastExportAt, onOpenBackup, onExport }: Props) {
  const [exporting, setExporting] = useState(false);
  const hasEntries = entries.length > 0;
  const value = saldo(entries);
  const status = saldoStatus(value, hasEntries);
  const t = totals(entries);
  const net = netReductionLabel(netReduction(entries));
  const reminder = backupReminder(entries, lastExportAt);

  const exportNow = () => {
    if (exporting) return;
    setExporting(true);
    onExport().finally(() => setExporting(false));
  };

  // Große Zahl: bei vielen Stellen kleiner setzen, damit sie in die Breite passt
  const digits = status.number.length;
  const sizeClass = digits >= 5 ? ' saldo__number--xs' : digits === 4 ? ' saldo__number--s' : '';

  return (
    <div className="screen saldo">
      <header className="header">
        <div className="wordmark">1-in-2-out</div>
        <button type="button" className="icon-button" aria-label="Backup und Einstellungen" onClick={onOpenBackup}>
          <IconArchive />
        </button>
      </header>

      <div className={`saldo__body${reminder ? ' saldo__body--banner' : ''}`}>
        {reminder && (
          <button type="button" className="banner" onClick={exportNow} disabled={exporting}>
            <IconArchive size={22} className="banner__icon" />
            <span className="banner__text">
              {backupReminderText(reminder)} – <span className="banner__link">jetzt sichern</span>
            </span>
            <IconChevronRight size={18} className="banner__chevron" />
          </button>
        )}

        <div className={`saldo__hero${reminder ? ' saldo__hero--after-banner' : ''}`}>
          <div className="overline">Saldo</div>
          <div
            className={`saldo__number num tone-${status.tone}${sizeClass}${status.number.startsWith('+') || status.number.startsWith('−') ? ' saldo__number--signed' : ''}`}
          >
            {status.number}
          </div>
          <div className="saldo__status">
            <div className={`saldo__status-main tone-${status.tone}`}>{status.status}</div>
            <div className="saldo__subline">{status.subline}</div>
          </div>
        </div>

        {hasEntries ? (
          <div className="ledger saldo__ledger">
            <div className="ledger__net">
              <span className="ledger__label">Netto-Reduktion seit Start</span>
              <span className="ledger__net-value">
                <span className="num ledger__net-number">{net.value}</span>
                <span className="ledger__label">{net.label}</span>
              </span>
            </div>
            <div className="ledger__cols">
              <div className="ledger__col">
                <span className="ledger__col-label">Raus</span>
                <span className="num ledger__col-value">{t.out}</span>
              </div>
              <div className="ledger__col">
                <span className="ledger__col-label">Rein</span>
                <span className="num ledger__col-value">{t.in}</span>
              </div>
              <div className="ledger__col">
                <span className="ledger__col-label">Ersatz</span>
                <span className="num ledger__col-value">{t.replacement}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="first-start">
            <p className="first-start__title">Für jedes Neue gehen zwei Dinge.</p>
            <p className="first-start__text">
              Tippe auf Plus und logge den ersten Gegenstand, der die Wohnung verlässt. Ersatz für Kaputtes zählt nicht.
            </p>
            <svg
              className="first-start__arrow"
              width="80"
              height="70"
              viewBox="0 0 80 70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 4c14 6 26 22 22 52" />
              <path d="M24 50l6 8 6-8" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
