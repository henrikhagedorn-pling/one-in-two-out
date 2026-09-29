// CSV-Format (Abschnitt 5): UTF-8 mit BOM, Trennzeichen „;“, Felder mit
// Sonderzeichen in "…", " escaped als "". Kopfzeile: id;typ;name;menge;datum;erstellt_am

import { compareEntries } from './calc';
import { isValidISODate } from './dates';
import type { Entry, EntryType } from './types';

export const CSV_COLUMNS = ['id', 'typ', 'name', 'menge', 'datum', 'erstellt_am'] as const;
export const CSV_HEADER = CSV_COLUMNS.join(';');
const BOM = '﻿';
const EOL = '\r\n';

const TYPE_TO_CSV: Record<EntryType, string> = { in: 'rein', out: 'raus', replacement: 'ersatz' };
const CSV_TO_TYPE: Record<string, EntryType> = { rein: 'in', raus: 'out', ersatz: 'replacement' };

export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `1in2out-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.csv`;
}

function escapeField(value: string, delimiter = ';'): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Export: chronologisch aufsteigend (älteste zuerst), damit die Datei in Numbers natürlich liest. */
export function entriesToCsv(entries: readonly Entry[]): string {
  const sorted = [...entries].sort((a, b) => compareEntries(b, a));
  const lines = [CSV_HEADER];
  for (const e of sorted) {
    lines.push(
      [e.id, TYPE_TO_CSV[e.type], e.name, String(e.quantity), e.date, e.createdAt].map((v) => escapeField(v)).join(';'),
    );
  }
  return BOM + lines.join(EOL) + EOL;
}

// ---------- Parser ----------

/** RFC-4180-artiger Parser. Liefert Datensätze (Zeilen im Sinne von Numbers) als Feldlisten. */
export function parseCsvRecords(text: string, delimiter = ';'): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"' && field === '') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delimiter) {
      record.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r' || c === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      i += c === '\r' && text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += c;
    i++;
  }
  // letzter Datensatz ohne abschließenden Zeilenumbruch
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

export interface ImportError {
  /** Zeilennummer wie in Numbers, Kopfzeile = 1 */
  line: number;
  messages: string[];
}

export interface ImportStats {
  out: number;
  in: number;
  replacement: number;
}

export type ImportResult =
  | { ok: true; total: number; entries: Entry[]; stats: ImportStats; range: { from: string; to: string } | null }
  | { ok: false; total: number; errors: ImportError[] };

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/;

const isBlankRecord = (r: string[]) => r.length === 1 && r[0].trim() === '';

export function parseBackupCsv(text: string): ImportResult {
  if (text.startsWith(BOM)) text = text.slice(1);

  // Trennzeichen aus der Kopfzeile ableiten (falls die Datei mit Komma neu gespeichert wurde)
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = !firstLine.includes(';') && firstLine.includes(',') ? ',' : ';';

  const records = parseCsvRecords(text, delimiter);
  // leere Zeilen am Ende ignorieren
  while (records.length > 0 && isBlankRecord(records[records.length - 1])) records.pop();

  if (records.length === 0) {
    return { ok: false, total: 0, errors: [{ line: 1, messages: ['Datei ist leer'] }] };
  }

  const dataRecords = records.slice(1).map((fields, idx) => ({ fields, line: idx + 2 })).filter((r) => !isBlankRecord(r.fields));
  const total = dataRecords.length;

  const header = records[0].map((h) => h.trim().toLowerCase());
  if (header.length !== CSV_COLUMNS.length || header.some((h, i) => h !== CSV_COLUMNS[i])) {
    return {
      ok: false,
      total,
      errors: [{ line: 1, messages: [`falsche Kopfzeile – erwartet: ${CSV_HEADER}`] }],
    };
  }

  const errors: ImportError[] = [];
  const entries: Entry[] = [];
  const seenIds = new Map<string, number>();

  for (const { fields, line } of dataRecords) {
    const messages: string[] = [];
    if (fields.length !== CSV_COLUMNS.length) {
      messages.push(`falsche Spaltenzahl: ${fields.length} statt ${CSV_COLUMNS.length}`);
      errors.push({ line, messages });
      continue;
    }
    const [rawId, rawType, rawName, rawQty, rawDate, rawCreated] = fields;
    const id = rawId.trim();
    const typ = rawType.trim();
    const name = rawName.trim();
    const qty = rawQty.trim();
    const date = rawDate.trim();
    const createdAt = rawCreated.trim();

    if (!id) messages.push('id fehlt');
    else if (seenIds.has(id)) messages.push(`id „${id}“ doppelt (auch in Zeile ${seenIds.get(id)})`);
    else seenIds.set(id, line);

    const type = CSV_TO_TYPE[typ.toLowerCase()];
    if (!type) messages.push(`typ „${typ}“ unbekannt – erlaubt: rein, raus, ersatz`);

    if (!name) messages.push('name ist leer');

    const quantity = /^\d+$/.test(qty) ? Number(qty) : NaN;
    if (!Number.isSafeInteger(quantity) || quantity < 1) messages.push(`menge „${qty}“ ist keine ganze Zahl ≥ 1`);

    if (!isValidISODate(date)) messages.push(`datum „${date}“ ist kein gültiges Datum`);

    if (!ISO_TIMESTAMP.test(createdAt) || Number.isNaN(Date.parse(createdAt))) {
      messages.push(`erstellt_am „${createdAt}“ ist kein gültiger Zeitstempel`);
    }

    if (messages.length > 0) {
      errors.push({ line, messages });
      continue;
    }
    entries.push({ id, type, name, quantity, date, createdAt });
  }

  if (errors.length > 0) return { ok: false, total, errors };

  const stats: ImportStats = { out: 0, in: 0, replacement: 0 };
  let from: string | null = null;
  let to: string | null = null;
  for (const e of entries) {
    stats[e.type]++;
    if (from === null || e.date < from) from = e.date;
    if (to === null || e.date > to) to = e.date;
  }
  return { ok: true, total, entries, stats, range: from && to ? { from, to } : null };
}
