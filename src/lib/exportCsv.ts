import { backupFileName, entriesToCsv } from './csv';
import type { Entry } from './types';

export type ExportOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Erzeugt die CSV und öffnet das Teilen-Menü (navigator.share mit Datei).
 * Fallback ohne Share-Unterstützung: Download.
 * Muss synchron aus einer Nutzergeste heraus aufgerufen werden (kein await davor).
 */
export async function exportEntries(entries: readonly Entry[], now: Date = new Date()): Promise<ExportOutcome> {
  const name = backupFileName(now);
  const csv = entriesToCsv(entries);
  const file = new File([csv], name, { type: 'text/csv' });

  const canShareFiles =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // z. B. NotAllowedError: auf Download ausweichen
    }
  }

  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
